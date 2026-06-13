import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PostFormat, PostStatus, Prisma, PublicationType } from '@prisma/client';
import { PublicationsService } from '../publications/publications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import {
  ListPostsQueryDto,
  PostStatusFilter,
} from './dto/list-posts.query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import {
  POST_PUBLISHED_EVENT,
  type PostPublishedPayload,
} from './events/post-published.event';

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

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicationsService: PublicationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createForOwner(
    userId: string,
    dto: CreatePostDto,
  ): Promise<PostWithTags> {
    const pub = await this.requirePublicationOwner(userId);

    this.validateFormat(dto.format, dto.markdownContent, dto.blocks);

    if (dto.tags && dto.tags.length > MAX_TAGS) {
      throw new BadRequestException(JSON.stringify({ code: 'post_too_many_tags' }));
    }
    if (dto.format === PostFormat.BLOCKS && Array.isArray(dto.blocks) && (dto.blocks as unknown[]).length > MAX_BLOCKS) {
      throw new BadRequestException(JSON.stringify({ code: 'post_too_many_blocks' }));
    }

    let slug = dto.slug ?? generateSlug(dto.title);
    slug = await this.ensureUniqueSlug(pub.id, slug);

    try {
      const post = await this.prisma.post.create({
        data: {
          publicationId: pub.id,
          title: dto.title.trim(),
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
        await this.replacePostTags(post.id, pub.id, dto.tags);
      }
      return this.getByIdWithTags(post.id);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async listForOwner(
    userId: string,
    query: ListPostsQueryDto,
  ): Promise<{ data: PostWithTags[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const pub = await this.requirePublicationOwner(userId);
    const statusFilter = this.statusToPrismaFilter(query.status);
    return this.paginatePosts(
      { publicationId: pub.id, deletedAt: null, ...statusFilter },
      { orderBy: [{ updatedAt: 'desc' }], page: query.page, limit: query.limit },
    );
  }

  async listPublishedForPublication(
    publicationId: string,
    query: ListPostsQueryDto,
  ): Promise<{ data: PostWithTags[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    return this.paginatePosts(
      { publicationId, status: PostStatus.PUBLISHED, deletedAt: null },
      { orderBy: [{ publishedAt: 'desc' }], page: query.page, limit: query.limit },
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

  async getPublishedBySlug(publicationId: string, slug: string): Promise<PostWithTags> {
    const post = await this.prisma.post.findFirst({
      where: { publicationId, slug, status: PostStatus.PUBLISHED, deletedAt: null },
      include: postWithTagsInclude,
    });
    if (!post) throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));
    return post;
  }

  async getBySlugForOwner(userId: string, slug: string): Promise<PostWithTags> {
    const pub = await this.requirePublicationOwner(userId);
    const post = await this.prisma.post.findFirst({
      where: { publicationId: pub.id, slug, deletedAt: null },
      include: postWithTagsInclude,
    });
    if (!post) throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));
    return post;
  }

  async updateForOwner(
    userId: string,
    slug: string,
    dto: UpdatePostDto,
  ): Promise<PostWithTags> {
    const existing = await this.getBySlugForOwner(userId, slug);
    const pub = await this.requirePublicationOwner(userId);

    const contentChanged =
      dto.title !== undefined ||
      dto.markdownContent !== undefined ||
      dto.blocks !== undefined;

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
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
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
        await this.replacePostTags(existing.id, pub.id, dto.tags);
      }
      return this.getByIdWithTags(existing.id);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async softDeleteForOwner(userId: string, slug: string): Promise<{ deleted: true }> {
    const existing = await this.getBySlugForOwner(userId, slug);
    await this.prisma.post.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async publishForOwner(userId: string, slug: string): Promise<PostWithTags> {
    const existing = await this.getBySlugForOwner(userId, slug);
    const pub = await this.requirePublicationOwner(userId);
    const wasPublished = existing.status === PostStatus.PUBLISHED;

    await this.saveRevision(existing);

    const post = await this.prisma.post.update({
      where: { id: existing.id },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        scheduledAt: null,
      },
      include: postWithTagsInclude,
    });

    if (!wasPublished) {
      // Only emit newsletter job if type supports it
      if (pub.type === PublicationType.NEWSLETTER || pub.type === PublicationType.BOTH) {
        const payload: PostPublishedPayload = {
          publicationId: pub.id,
          postId: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          publicationType: pub.type,
        };
        this.eventEmitter.emit(POST_PUBLISHED_EVENT, payload);
      }
    }

    return post;
  }

  async unpublishForOwner(userId: string, slug: string): Promise<PostWithTags> {
    const existing = await this.getBySlugForOwner(userId, slug);
    return this.prisma.post.update({
      where: { id: existing.id },
      data: { status: PostStatus.DRAFT, publishedAt: null },
      include: postWithTagsInclude,
    });
  }

  async scheduleForOwner(
    userId: string,
    slug: string,
    scheduledAt: Date,
  ): Promise<PostWithTags> {
    const existing = await this.getBySlugForOwner(userId, slug);

    const minDate = new Date(Date.now() + 5 * 60 * 1000);
    if (scheduledAt <= minDate) {
      throw new BadRequestException(JSON.stringify({ code: 'post_schedule_past' }));
    }

    return this.prisma.post.update({
      where: { id: existing.id },
      data: { status: PostStatus.SCHEDULED, scheduledAt },
      include: postWithTagsInclude,
    });
  }

  async listRevisionsForOwner(
    userId: string,
    slug: string,
  ): Promise<Prisma.PostRevisionGetPayload<object>[]> {
    const post = await this.getBySlugForOwner(userId, slug);
    return this.prisma.postRevision.findMany({
      where: { postId: post.id },
      orderBy: { revisionNumber: 'desc' },
      take: 50,
    });
  }

  async getRevisionForOwner(
    userId: string,
    slug: string,
    revisionNumber: number,
  ): Promise<Prisma.PostRevisionGetPayload<object>> {
    const post = await this.getBySlugForOwner(userId, slug);
    const revision = await this.prisma.postRevision.findUnique({
      where: { postId_revisionNumber: { postId: post.id, revisionNumber } },
    });
    if (!revision) throw new NotFoundException('Revision not found');
    return revision;
  }

  private async saveRevision(post: PostWithTags): Promise<void> {
    const maxRevision = await this.prisma.postRevision.findFirst({
      where: { postId: post.id },
      orderBy: { revisionNumber: 'desc' },
      select: { revisionNumber: true },
    });
    const nextNumber = (maxRevision?.revisionNumber ?? 0) + 1;

    // Enforce max 50 revisions
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
    while (true) {
      const existing = await this.prisma.post.findFirst({
        where: { publicationId, slug: candidate, deletedAt: null },
      });
      if (!existing) return candidate;
      candidate = `${slug}-${counter}`;
      counter++;
    }
  }

  private async replacePostTags(
    postId: string,
    publicationId: string,
    tags: string[],
  ): Promise<void> {
    const normalized = [...new Set(tags.map((t) => t.trim().toLowerCase()))].filter(Boolean);

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

  private validateFormat(
    format: PostFormat,
    markdownContent?: string,
    blocks?: unknown,
  ): void {
    if (format === PostFormat.MARKDOWN && !markdownContent) {
      throw new BadRequestException(JSON.stringify({ code: 'post_invalid_format' }));
    }
    if (format === PostFormat.BLOCKS && (!blocks || !Array.isArray(blocks) || (blocks as unknown[]).length === 0)) {
      throw new BadRequestException(JSON.stringify({ code: 'post_invalid_format' }));
    }
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(JSON.stringify({ code: 'post_slug_taken' }));
    }
  }

  private async getByIdWithTags(postId: string): Promise<PostWithTags> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: postWithTagsInclude,
    });
    if (!post) throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));
    return post;
  }

  private async requirePublicationOwner(userId: string) {
    // Get first non-deleted publication for user (single publication context)
    // In multi-pub context, publicationId would come from tenant middleware
    const pub = await this.prisma.publication.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!pub) throw new ForbiddenException('No publication found for current user');
    return pub;
  }
}
