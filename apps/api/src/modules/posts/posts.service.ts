import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PostFormat, PostStatus, Prisma, Publication, PublicationType } from '@prisma/client';
import * as he from 'he';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { GRIZZLY_QUEUE, JobName } from '../queue/queue.constants';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto, PostStatusFilter } from './dto/list-posts.query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { validateBlocks } from './schemas/blocks.schema';
import { POST_PUBLISHED_EVENT, type PostPublishedPayload } from './events/post-published.event';

const postWithTagsInclude = {
  tags: { include: { tag: true } },
} satisfies Prisma.PostInclude;

export type PostWithTags = Prisma.PostGetPayload<{
  include: typeof postWithTagsInclude;
}>;

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

const MAX_REVISIONS = 50;
const MAX_BLOCKS = 500;
const MAX_TAGS = 30;
const MIN_SCHEDULE_MINUTES = 5;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(GRIZZLY_QUEUE) private readonly queue: Queue,
  ) {}

  async createForPublication(
    publication: Publication,
    userId: string,
    dto: CreatePostDto,
  ): Promise<PostWithTags> {
    this.assertOwner(publication, userId);
    this.validateFormat(dto.format, dto.markdownContent, dto.blocks);

    if (dto.tags && dto.tags.length > MAX_TAGS) {
      throw new BadRequestException(JSON.stringify({ code: 'post_too_many_tags' }));
    }

    let slug = dto.slug ?? generateSlug(dto.title);
    slug = await this.ensureUniqueSlug(publication.id, slug);

    try {
      const post = await this.prisma.post.create({
        data: {
          publicationId: publication.id,
          title: he.encode(dto.title.trim()),
          slug,
          excerpt: dto.excerpt ?? '',
          format: dto.format,
          markdownContent: dto.format === PostFormat.MARKDOWN ? (dto.markdownContent ?? null) : null,
          blocks: dto.format === PostFormat.BLOCKS ? (dto.blocks as Prisma.InputJsonValue) : Prisma.DbNull,
          metaTitle: dto.metaTitle ?? '',
          metaDescription: dto.metaDescription ?? '',
          ogImageUrl: dto.ogImageUrl ?? null,
          canonicalUrl: dto.canonicalUrl ?? null,
        },
      });
      if (dto.tags?.length) {
        await this.replacePostTags(post.id, publication.id, dto.tags);
      }
      return this.getByIdWithTags(post.id);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async listForPublication(
    publication: Publication,
    userId: string | undefined,
    query: ListPostsQueryDto,
  ): Promise<{ data: PostWithTags[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const isOwner = userId === publication.userId;
    const statusFilter = isOwner ? this.statusToPrismaFilter(query.status) : { status: PostStatus.PUBLISHED };
    const tagFilter: Prisma.PostWhereInput = query.tag
      ? { tags: { some: { tag: { name: query.tag.trim().toLowerCase() } } } }
      : {};

    if (!isOwner) {
      this.assertPublicReadable(publication);
    }

    return this.paginatePosts(
      { publicationId: publication.id, deletedAt: null, ...statusFilter, ...tagFilter },
      { orderBy: [{ updatedAt: 'desc' }], page: query.page, limit: query.limit },
    );
  }

  private async paginatePosts(
    where: Prisma.PostWhereInput,
    opts: { page: number; limit: number; orderBy: Prisma.PostOrderByWithRelationInput[] },
  ): Promise<{ data: PostWithTags[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const { page, limit, orderBy } = opts;
    const [total, posts] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: postWithTagsInclude }),
    ]);
    return { data: posts, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getBySlug(publication: Publication, userId: string | undefined, slug: string): Promise<PostWithTags> {
    const isOwner = userId === publication.userId;
    const post = await this.prisma.post.findFirst({
      where: { publicationId: publication.id, slug, deletedAt: null },
      include: postWithTagsInclude,
    });
    if (!post) throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));

    if (!isOwner) {
      this.assertPublicReadable(publication);
      if (post.status !== PostStatus.PUBLISHED) {
        throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));
      }
    }
    return post;
  }

  async updateForOwner(
    publication: Publication,
    userId: string,
    slug: string,
    dto: UpdatePostDto,
  ): Promise<PostWithTags> {
    this.assertOwner(publication, userId);
    const existing = await this.requireOwnedPost(publication, slug);

    const contentChanged =
      dto.title !== undefined || dto.markdownContent !== undefined || dto.blocks !== undefined;

    if (contentChanged) {
      await this.saveRevision(existing);
    }

    if (dto.format !== undefined) {
      this.validateFormat(dto.format, dto.markdownContent, dto.blocks);
    }
    if (dto.tags && dto.tags.length > MAX_TAGS) {
      throw new BadRequestException(JSON.stringify({ code: 'post_too_many_tags' }));
    }

    try {
      await this.prisma.post.update({
        where: { id: existing.id },
        data: {
          ...(dto.title !== undefined ? { title: he.encode(dto.title.trim()) } : {}),
          ...(dto.slug !== undefined ? { slug: dto.slug.trim().toLowerCase() } : {}),
          ...(dto.excerpt !== undefined ? { excerpt: dto.excerpt } : {}),
          ...(dto.format !== undefined ? { format: dto.format } : {}),
          ...(dto.markdownContent !== undefined ? { markdownContent: dto.markdownContent } : {}),
          ...(dto.blocks !== undefined ? { blocks: dto.blocks as Prisma.InputJsonValue } : {}),
          ...(dto.metaTitle !== undefined ? { metaTitle: dto.metaTitle } : {}),
          ...(dto.metaDescription !== undefined ? { metaDescription: dto.metaDescription } : {}),
          ...(dto.ogImageUrl !== undefined ? { ogImageUrl: dto.ogImageUrl } : {}),
          ...(dto.canonicalUrl !== undefined ? { canonicalUrl: dto.canonicalUrl } : {}),
        },
      });
      if (dto.tags !== undefined) {
        await this.replacePostTags(existing.id, publication.id, dto.tags);
      }
      return this.getByIdWithTags(existing.id);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async softDeleteForOwner(publication: Publication, userId: string, slug: string): Promise<{ deleted: true }> {
    this.assertOwner(publication, userId);
    const existing = await this.requireOwnedPost(publication, slug);
    await this.prisma.post.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  async publishForOwner(publication: Publication, userId: string, slug: string): Promise<PostWithTags> {
    this.assertOwner(publication, userId);
    const existing = await this.requireOwnedPost(publication, slug);
    const wasPublished = existing.status === PostStatus.PUBLISHED;

    await this.saveRevision(existing);

    const post = await this.prisma.post.update({
      where: { id: existing.id },
      data: { status: PostStatus.PUBLISHED, publishedAt: new Date(), scheduledAt: null },
      include: postWithTagsInclude,
    });

    if (!wasPublished) {
      const payload: PostPublishedPayload = {
        publicationId: publication.id,
        postId: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        publicationType: publication.type,
      };
      this.eventEmitter.emit(POST_PUBLISHED_EVENT, payload);
    }

    return post;
  }

  async unpublishForOwner(publication: Publication, userId: string, slug: string): Promise<PostWithTags> {
    this.assertOwner(publication, userId);
    const existing = await this.requireOwnedPost(publication, slug);
    return this.prisma.post.update({
      where: { id: existing.id },
      data: { status: PostStatus.DRAFT, publishedAt: null },
      include: postWithTagsInclude,
    });
  }

  async scheduleForOwner(
    publication: Publication,
    userId: string,
    slug: string,
    scheduledAtIso: string,
  ): Promise<PostWithTags> {
    this.assertOwner(publication, userId);
    const existing = await this.requireOwnedPost(publication, slug);

    const scheduledAt = new Date(scheduledAtIso);
    const minDate = new Date(Date.now() + MIN_SCHEDULE_MINUTES * 60 * 1000);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= minDate) {
      throw new BadRequestException(JSON.stringify({ code: 'post_schedule_past' }));
    }

    const updated = await this.prisma.post.update({
      where: { id: existing.id },
      data: { status: PostStatus.SCHEDULED, scheduledAt },
      include: postWithTagsInclude,
    });

    const delay = scheduledAt.getTime() - Date.now();
    await this.queue.add(
      JobName.POST_SCHEDULE,
      { postId: updated.id },
      { delay, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    return updated;
  }

  async listRevisionsForOwner(
    publication: Publication,
    userId: string,
    slug: string,
  ): Promise<Prisma.PostRevisionGetPayload<object>[]> {
    this.assertOwner(publication, userId);
    const post = await this.requireOwnedPost(publication, slug);
    return this.prisma.postRevision.findMany({
      where: { postId: post.id },
      orderBy: { revisionNumber: 'desc' },
      take: 50,
    });
  }

  async getRevisionForOwner(
    publication: Publication,
    userId: string,
    slug: string,
    revisionNumber: number,
  ): Promise<Prisma.PostRevisionGetPayload<object>> {
    this.assertOwner(publication, userId);
    const post = await this.requireOwnedPost(publication, slug);
    const revision = await this.prisma.postRevision.findUnique({
      where: { postId_revisionNumber: { postId: post.id, revisionNumber } },
    });
    if (!revision) throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));
    return revision;
  }

  async publishIfStillScheduled(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, include: { publication: true } });
    if (!post || post.status !== PostStatus.SCHEDULED) return;

    await this.saveRevision({ ...post, tags: [] } as unknown as PostWithTags);
    const updated = await this.prisma.post.update({
      where: { id: post.id },
      data: { status: PostStatus.PUBLISHED, publishedAt: new Date(), scheduledAt: null },
    });

    const payload: PostPublishedPayload = {
      publicationId: post.publicationId,
      postId: updated.id,
      title: updated.title,
      slug: updated.slug,
      excerpt: updated.excerpt,
      publicationType: post.publication.type,
    };
    this.eventEmitter.emit(POST_PUBLISHED_EVENT, payload);
  }

  private async saveRevision(post: PostWithTags): Promise<void> {
    const maxRevision = await this.prisma.postRevision.findFirst({
      where: { postId: post.id },
      orderBy: { revisionNumber: 'desc' },
      select: { revisionNumber: true },
    });
    const nextNumber = (maxRevision?.revisionNumber ?? 0) + 1;

    const count = await this.prisma.postRevision.count({ where: { postId: post.id } });
    if (count >= MAX_REVISIONS) {
      const oldest = await this.prisma.postRevision.findFirst({
        where: { postId: post.id },
        orderBy: { revisionNumber: 'asc' },
      });
      if (oldest) {
        await this.prisma.postRevision.delete({ where: { id: oldest.id } });
      }
    }

    await this.prisma.postRevision.create({
      data: {
        postId: post.id,
        title: post.title,
        format: post.format,
        markdownContent: post.markdownContent,
        blocks: post.blocks == null ? Prisma.DbNull : (post.blocks as Prisma.InputJsonValue),
        revisionNumber: nextNumber,
      },
    });
  }

  private async ensureUniqueSlug(publicationId: string, slug: string): Promise<string> {
    let candidate = slug;
    let counter = 2;
    for (;;) {
      const existing = await this.prisma.post.findFirst({
        where: { publicationId, slug: candidate, deletedAt: null },
      });
      if (!existing) return candidate;
      candidate = `${slug}-${counter}`;
      counter++;
    }
  }

  private async replacePostTags(postId: string, publicationId: string, tags: string[]): Promise<void> {
    const normalized = [...new Set(tags.map((t) => he.encode(t.trim().toLowerCase()).slice(0, 50)))].filter(Boolean);

    await this.prisma.$transaction(async (tx) => {
      await tx.postTag.deleteMany({ where: { postId } });

      const tagRecords = await Promise.all(
        normalized.map((name) =>
          tx.tag.upsert({
            where: { publicationId_name: { publicationId, name } },
            create: { publicationId, name },
            update: {},
          }),
        ),
      );

      if (tagRecords.length > 0) {
        await tx.postTag.createMany({
          data: tagRecords.map((tag) => ({ postId, tagId: tag.id })),
          skipDuplicates: true,
        });
      }
    });
  }

  private statusToPrismaFilter(status: PostStatusFilter): Prisma.PostWhereInput {
    switch (status) {
      case PostStatusFilter.DRAFT:
        return { status: PostStatus.DRAFT };
      case PostStatusFilter.PUBLISHED:
        return { status: PostStatus.PUBLISHED };
      case PostStatusFilter.SCHEDULED:
        return { status: PostStatus.SCHEDULED };
      case PostStatusFilter.ALL:
      default:
        return {};
    }
  }

  private validateFormat(format: PostFormat, markdownContent?: string, blocks?: unknown): void {
    if (format === PostFormat.MARKDOWN && !markdownContent) {
      throw new BadRequestException(JSON.stringify({ code: 'post_invalid_format' }));
    }
    if (format === PostFormat.BLOCKS) {
      if (!blocks || !Array.isArray(blocks) || (blocks as unknown[]).length === 0) {
        throw new BadRequestException(JSON.stringify({ code: 'post_invalid_format' }));
      }
      if ((blocks as unknown[]).length > MAX_BLOCKS) {
        throw new BadRequestException(JSON.stringify({ code: 'post_too_many_blocks' }));
      }
      try {
        validateBlocks(blocks);
      } catch {
        throw new BadRequestException(JSON.stringify({ code: 'post_invalid_format' }));
      }
    }
  }

  private assertPublicReadable(publication: Publication): void {
    if (!publication.isPublic) {
      throw new NotFoundException(JSON.stringify({ code: 'publication_not_public' }));
    }
    if (publication.type === PublicationType.NEWSLETTER) {
      throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));
    }
  }

  private assertOwner(publication: Publication, userId: string): void {
    if (publication.userId !== userId) {
      throw new ForbiddenException('Forbidden');
    }
  }

  private async requireOwnedPost(publication: Publication, slug: string): Promise<PostWithTags> {
    const post = await this.prisma.post.findFirst({
      where: { publicationId: publication.id, slug, deletedAt: null },
      include: postWithTagsInclude,
    });
    if (!post) throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));
    return post;
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(JSON.stringify({ code: 'post_slug_taken' }));
    }
  }

  private async getByIdWithTags(postId: string): Promise<PostWithTags> {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, include: postWithTagsInclude });
    if (!post) throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));
    return post;
  }
}
