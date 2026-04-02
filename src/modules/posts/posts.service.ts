import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Post, Prisma } from '@prisma/client';
import MarkdownIt from 'markdown-it';
import { BlogsService } from '../blogs/blogs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import {
  ListPostsQueryDto,
  PostStatusFilter,
} from './dto/list-posts.query.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
});

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blogsService: BlogsService,
  ) {}

  async createForOwner(userId: string, dto: CreatePostDto): Promise<Post> {
    const blog = await this.blogsService.findByOwnerId(userId);
    if (!blog) {
      throw new ForbiddenException('No blog found for current user');
    }

    const html = markdown.render(dto.contentMarkdown);

    try {
      return await this.prisma.post.create({
        data: {
          blogId: blog.id,
          title: dto.title.trim(),
          slug: dto.slug.trim().toLowerCase(),
          contentMarkdown: dto.contentMarkdown,
          contentHtml: html,
          featuredImageUrl: dto.featuredImageUrl?.trim(),
        },
      });
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async listForOwner(
    userId: string,
    query: ListPostsQueryDto,
  ): Promise<Post[]> {
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
    });
  }

  async getByIdForOwner(userId: string, postId: string): Promise<Post> {
    const blog = await this.blogsService.findByOwnerId(userId);
    if (!blog) {
      throw new ForbiddenException('No blog found for current user');
    }

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
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
  ): Promise<Post> {
    const existing = await this.getByIdForOwner(userId, postId);

    let contentHtml: string | undefined;
    if (dto.contentMarkdown !== undefined) {
      contentHtml = markdown.render(dto.contentMarkdown);
    }

    try {
      return await this.prisma.post.update({
        where: { id: existing.id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.slug !== undefined
            ? { slug: dto.slug.trim().toLowerCase() }
            : {}),
          ...(dto.contentMarkdown !== undefined
            ? { contentMarkdown: dto.contentMarkdown }
            : {}),
          ...(contentHtml !== undefined ? { contentHtml } : {}),
          ...(dto.featuredImageUrl !== undefined
            ? { featuredImageUrl: dto.featuredImageUrl.trim() || null }
            : {}),
        },
      });
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

  async publishForOwner(userId: string, postId: string): Promise<Post> {
    const existing = await this.getByIdForOwner(userId, postId);
    return this.prisma.post.update({
      where: { id: existing.id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  async unpublishForOwner(userId: string, postId: string): Promise<Post> {
    const existing = await this.getByIdForOwner(userId, postId);
    return this.prisma.post.update({
      where: { id: existing.id },
      data: {
        isPublished: false,
        publishedAt: null,
      },
    });
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
