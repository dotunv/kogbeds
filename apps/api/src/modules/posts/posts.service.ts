import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { BlogsService } from '../blogs/blogs.service';
import {
  ContentBlocksValidationError,
  ContentRendererService,
} from '../content/content-renderer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import {
  ListPostsQueryDto,
  PostStatusFilter,
} from './dto/list-posts.query.dto';
import { PreviewPostDto } from './dto/preview-post.dto';
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

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blogsService: BlogsService,
    private readonly contentRenderer: ContentRendererService,
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
  ) {}

  async previewForOwner(
    userId: string,
    dto: PreviewPostDto,
  ): Promise<{ contentHtml: string; excerpt: string; searchableText: string }> {
    const blog = await this.blogsService.findByOwnerId(userId);
    if (!blog) {
      throw new ForbiddenException('No blog found for current user');
    }
    void blog;

    const hasMarkdown =
      dto.contentMarkdown !== undefined && dto.contentMarkdown.trim() !== '';
    const hasBlocks = dto.blocks !== undefined;

    if (hasMarkdown && hasBlocks) {
      throw new BadRequestException(
        'Provide either contentMarkdown or blocks, not both',
      );
    }
    if (!hasMarkdown && !hasBlocks) {
      throw new BadRequestException(
        'Provide either contentMarkdown or blocks with at least one block',
      );
    }

    if (hasMarkdown) {
      return this.contentRenderer.renderFromMarkdown(
        dto.contentMarkdown!.trim(),
      );
    }

    try {
      return this.contentRenderer.parseAndRenderBlocksV1(dto.blocks);
    } catch (err: unknown) {
      if (err instanceof ContentBlocksValidationError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async createForOwner(
    userId: string,
    dto: CreatePostDto,
  ): Promise<PostWithTags> {
    const blog = await this.blogsService.findByOwnerId(userId);
    if (!blog) {
      throw new ForbiddenException('No blog found for current user');
    }

    const hasMarkdown =
      dto.contentMarkdown !== undefined && dto.contentMarkdown.trim() !== '';
    const hasBlocks = dto.blocks !== undefined;

    if (hasMarkdown && hasBlocks) {
      throw new BadRequestException(
        'Provide either contentMarkdown or blocks, not both',
      );
    }
    if (!hasMarkdown && !hasBlocks) {
      throw new BadRequestException(
        'Provide either contentMarkdown or blocks with at least one block',
      );
    }

    let contentMarkdown: string | null;
    let blocks: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    let blockSchemaVersion: number;
    let contentHtml: string;
    let excerpt: string;
    let searchableText: string;

    if (hasMarkdown) {
      const md = dto.contentMarkdown!.trim();
      const rendered = this.contentRenderer.renderFromMarkdown(md);
      contentMarkdown = md;
      blocks = Prisma.DbNull;
      blockSchemaVersion = 1;
      contentHtml = rendered.contentHtml;
      excerpt = rendered.excerpt;
      searchableText = rendered.searchableText;
    } else {
      try {
        const rendered = this.contentRenderer.parseAndRenderBlocksV1(
          dto.blocks,
        );
        contentMarkdown = null;
        blocks = rendered.blocks as unknown as Prisma.InputJsonValue;
        blockSchemaVersion = 1;
        contentHtml = rendered.contentHtml;
        excerpt = rendered.excerpt;
        searchableText = rendered.searchableText;
      } catch (err: unknown) {
        if (err instanceof ContentBlocksValidationError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
    }

    try {
      const post = await this.prisma.post.create({
        data: {
          blogId: blog.id,
          title: dto.title.trim(),
          slug: dto.slug.trim().toLowerCase(),
          contentMarkdown,
          blocks,
          blockSchemaVersion,
          contentHtml,
          excerpt,
          searchableText,
          featuredImageUrl: dto.featuredImageUrl?.trim(),
        },
      });
      if (dto.tagSlugs?.length) {
        await this.replacePostTags(post.id, dto.tagSlugs);
      }
      return this.getByIdForOwnerWithTags(userId, post.id);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async listForOwner(
    userId: string,
    query: ListPostsQueryDto,
  ): Promise<PostWithTags[]> {
    const blog = await this.blogsService.findByOwnerId(userId);
    if (!blog) {
      throw new ForbiddenException('No blog found for current user');
    }

    const statusFilter = this.statusToPrismaFilter(query.status);

    return this.prisma.post.findMany({
      where: {
        blogId: blog.id,
        ...statusFilter,
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: postWithTagsInclude,
    });
  }

  async getByIdForOwner(userId: string, postId: string): Promise<PostWithTags> {
    return this.getByIdForOwnerWithTags(userId, postId);
  }

  private async getByIdForOwnerWithTags(
    userId: string,
    postId: string,
  ): Promise<PostWithTags> {
    const blog = await this.blogsService.findByOwnerId(userId);
    if (!blog) {
      throw new ForbiddenException('No blog found for current user');
    }

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: postWithTagsInclude,
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.blogId !== blog.id) {
      throw new ForbiddenException('You do not have access to this post');
    }

    return post;
  }

  async updateForOwner(
    userId: string,
    postId: string,
    dto: UpdatePostDto,
  ): Promise<PostWithTags> {
    const existing = await this.getByIdForOwnerWithTags(userId, postId);

    await this.saveRevision(existing, userId);

    const mdProvided = dto.contentMarkdown !== undefined;
    const blocksProvided = dto.blocks !== undefined;

    if (mdProvided && blocksProvided) {
      throw new BadRequestException(
        'Provide either contentMarkdown or blocks in an update, not both',
      );
    }

    let contentPatch: Prisma.PostUpdateInput | undefined;

    if (mdProvided) {
      const md = dto.contentMarkdown!.trim();
      const rendered = this.contentRenderer.renderFromMarkdown(md);
      contentPatch = {
        contentMarkdown: md,
        blocks: Prisma.DbNull,
        blockSchemaVersion: 1,
        contentHtml: rendered.contentHtml,
        excerpt: rendered.excerpt,
        searchableText: rendered.searchableText,
      };
    } else if (blocksProvided) {
      try {
        const rendered = this.contentRenderer.parseAndRenderBlocksV1(
          dto.blocks,
        );
        contentPatch = {
          contentMarkdown: null,
          blocks: rendered.blocks as unknown as Prisma.InputJsonValue,
          blockSchemaVersion: 1,
          contentHtml: rendered.contentHtml,
          excerpt: rendered.excerpt,
          searchableText: rendered.searchableText,
        };
      } catch (err: unknown) {
        if (err instanceof ContentBlocksValidationError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
    }

    try {
      await this.prisma.post.update({
        where: { id: existing.id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.slug !== undefined
            ? { slug: dto.slug.trim().toLowerCase() }
            : {}),
          ...(dto.featuredImageUrl !== undefined
            ? { featuredImageUrl: dto.featuredImageUrl.trim() || null }
            : {}),
          ...(contentPatch ?? {}),
        },
      });
      if (dto.tagSlugs !== undefined) {
        await this.replacePostTags(existing.id, dto.tagSlugs);
      }
      return this.getByIdForOwnerWithTags(userId, postId);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async deleteForOwner(
    userId: string,
    postId: string,
  ): Promise<{ deleted: true }> {
    const existing = await this.getByIdForOwner(userId, postId);
    await this.prisma.post.delete({
      where: { id: existing.id },
    });

    return { deleted: true };
  }

  async publishForOwner(userId: string, postId: string): Promise<PostWithTags> {
    const existing = await this.getByIdForOwnerWithTags(userId, postId);
    const wasPublished = existing.isPublished;

    const post = await this.prisma.post.update({
      where: { id: existing.id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
      include: postWithTagsInclude,
    });

    if (!wasPublished) {
      const blog = await this.prisma.blog.findUniqueOrThrow({
        where: { id: post.blogId },
        include: { owner: true },
      });
      const appDomain = this.config
        .getOrThrow<string>('APP_DOMAIN')
        .toLowerCase()
        .replace(/^www\./, '');
      const publicBase =
        this.config.get<string>('APP_PUBLIC_BASE_URL')?.replace(/\/$/, '') ??
        `https://${blog.owner.username}.${appDomain}`;
      const payload: PostPublishedPayload = {
        blogId: blog.id,
        postId: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        blogUsername: blog.owner.username,
        siteBaseUrl: publicBase,
      };
      this.eventEmitter.emit(POST_PUBLISHED_EVENT, payload);
    }

    return post;
  }

  async unpublishForOwner(
    userId: string,
    postId: string,
  ): Promise<PostWithTags> {
    const existing = await this.getByIdForOwnerWithTags(userId, postId);
    return this.prisma.post.update({
      where: { id: existing.id },
      data: {
        isPublished: false,
        publishedAt: null,
      },
      include: postWithTagsInclude,
    });
  }

  async listRevisionsForOwner(
    userId: string,
    postId: string,
  ): Promise<Prisma.PostRevisionGetPayload<object>[]> {
    await this.getByIdForOwner(userId, postId);
    return this.prisma.postRevision.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private async saveRevision(
    post: PostWithTags,
    userId: string,
  ): Promise<void> {
    await this.prisma.postRevision.create({
      data: {
        postId: post.id,
        contentMarkdown: post.contentMarkdown,
        blocks:
          post.blocks == null
            ? Prisma.DbNull
            : (post.blocks as Prisma.InputJsonValue),
        blockSchemaVersion: post.blockSchemaVersion,
        contentHtml: post.contentHtml,
        excerpt: post.excerpt,
        searchableText: post.searchableText,
        createdByUserId: userId,
      },
    });
  }

  private async replacePostTags(
    postId: string,
    slugs: string[],
  ): Promise<void> {
    const normalized = [
      ...new Set(slugs.map((s) => s.trim().toLowerCase())),
    ].filter(Boolean);
    await this.prisma.postTag.deleteMany({ where: { postId } });
    for (const slug of normalized) {
      const tag = await this.prisma.tag.upsert({
        where: { slug },
        create: { slug, name: slug },
        update: {},
      });
      await this.prisma.postTag.create({
        data: { postId, tagId: tag.id },
      });
    }
  }

  private statusToPrismaFilter(
    status: PostStatusFilter,
  ): Prisma.PostWhereInput {
    switch (status) {
      case PostStatusFilter.DRAFT:
        return { isPublished: false };
      case PostStatusFilter.PUBLISHED:
        return { isPublished: true };
      case PostStatusFilter.ALL:
      default:
        return {};
    }
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Slug already exists for this blog');
    }
  }
}
