import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CommentStatus } from '@prisma/client';
import * as he from 'he';
import { PrismaService } from '../../prisma/prisma.service';
import { GRIZZLY_QUEUE, JobName, DEFAULT_JOB_OPTS } from '../queue/queue.constants';
import { CreatePublicCommentDto } from './dto/create-public-comment.dto';
import { ModerateCommentAction } from './dto/moderate-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(GRIZZLY_QUEUE) private readonly queue: Queue,
  ) {}

  async listApprovedForPost(publicationId: string, postSlug: string) {
    const post = await this.prisma.post.findFirst({
      where: { publicationId, slug: postSlug, deletedAt: null },
    });
    if (!post) throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));

    return this.prisma.comment.findMany({
      where: { postId: post.id, status: CommentStatus.APPROVED },
      select: { id: true, authorName: true, body: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPending(
    publicationId: string,
    postSlug: string,
    dto: CreatePublicCommentDto,
  ): Promise<{ message: string }> {
    const post = await this.prisma.post.findFirst({
      where: { publicationId, slug: postSlug, deletedAt: null },
    });
    if (!post) throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));

    const comment = await this.prisma.comment.create({
      data: {
        postId: post.id,
        authorName: dto.authorName ? he.encode(dto.authorName.trim()) : null,
        authorEmail: dto.authorEmail?.trim().toLowerCase() || null,
        body: he.encode(dto.body.trim()),
        status: CommentStatus.PENDING,
      },
    });

    await this.queue.add(JobName.COMMENT_NOTIFY, { commentId: comment.id }, DEFAULT_JOB_OPTS);

    return { message: 'Comment submitted and awaiting moderation' };
  }

  async moderateForOwner(userId: string, commentId: string, action: ModerateCommentAction) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { include: { publication: true } } },
    });
    if (!comment) {
      throw new NotFoundException(JSON.stringify({ code: 'comment_not_found' }));
    }
    if (comment.post.publication.userId !== userId) {
      throw new ForbiddenException('Forbidden');
    }

    const statusMap: Record<ModerateCommentAction, CommentStatus> = {
      [ModerateCommentAction.APPROVED]: CommentStatus.APPROVED,
      [ModerateCommentAction.SPAM]: CommentStatus.SPAM,
      [ModerateCommentAction.REJECTED]: CommentStatus.REJECTED,
    };

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { status: statusMap[action] },
    });

    return { id: updated.id, status: updated.status, createdAt: updated.createdAt };
  }

  async removeForOwner(userId: string, commentId: string): Promise<{ deleted: true }> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { include: { publication: true } } },
    });
    if (!comment) {
      throw new NotFoundException(JSON.stringify({ code: 'comment_not_found' }));
    }
    if (comment.post.publication.userId !== userId) {
      throw new ForbiddenException('Forbidden');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  async listPendingForOwner(userId: string) {
    return this.prisma.comment.findMany({
      where: {
        status: CommentStatus.PENDING,
        post: { publication: { userId } },
      },
      select: {
        id: true,
        authorName: true,
        body: true,
        status: true,
        createdAt: true,
        post: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
