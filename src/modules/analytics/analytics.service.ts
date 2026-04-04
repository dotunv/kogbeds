import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Privacy-first rollup: one counter per blog/post/day (no per-visitor fingerprinting).
   */
  async recordPageView(input: {
    blogId: string;
    postId: string;
  }): Promise<void> {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);

    await this.prisma.pageViewRollup.upsert({
      where: {
        blogId_postId_day: {
          blogId: input.blogId,
          postId: input.postId,
          day,
        },
      },
      create: {
        blogId: input.blogId,
        postId: input.postId,
        day,
        views: 1,
      },
      update: {
        views: { increment: 1 },
      },
    });
  }

  async listRollupsForOwner(userId: string, blogId: string) {
    const blog = await this.prisma.blog.findFirst({
      where: { id: blogId, ownerId: userId },
    });
    if (!blog) {
      return [];
    }
    return this.prisma.pageViewRollup.findMany({
      where: { blogId },
      orderBy: [{ day: 'desc' }, { postId: 'asc' }],
      take: 90,
    });
  }
}
