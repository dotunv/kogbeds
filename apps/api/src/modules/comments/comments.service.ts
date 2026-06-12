import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommentModerationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePublicCommentDto } from './dto/create-public-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listApprovedForPost(postId: string) {
    return this.prisma.comment.findMany({
      where: {
        postId,
        status: CommentModerationStatus.APPROVED,
      },
      select: {
        id: true,
        authorName: true,
        body: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPending(postId: string, dto: CreatePublicCommentDto) {
    return this.prisma.comment.create({
      data: {
        postId,
        authorName: dto.authorName?.trim() || null,
        authorEmail: dto.authorEmail?.trim().toLowerCase() || null,
        body: dto.body.trim(),
        status: CommentModerationStatus.PENDING,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async moderateForOwner(
    userId: string,
    commentId: string,
    status: CommentModerationStatus,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: {
            blog: true,
          },
        },
      },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    const blog = await this.prisma.blog.findUnique({
      where: { id: comment.post.blogId },
    });
    if (!blog || blog.ownerId !== userId) {
      throw new ForbiddenException('You cannot moderate this comment');
    }
    if (status === CommentModerationStatus.PENDING) {
      throw new ForbiddenException('Cannot set status back to pending');
    }
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { status },
    });
  }

  async listPendingForOwner(userId: string, blogId: string) {
    const blog = await this.prisma.blog.findFirst({
      where: { id: blogId, ownerId: userId },
    });
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }
    return this.prisma.comment.findMany({
      where: {
        status: CommentModerationStatus.PENDING,
        post: { blogId },
      },
      include: {
        post: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
