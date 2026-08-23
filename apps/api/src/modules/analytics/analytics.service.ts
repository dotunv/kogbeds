import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_DAYS = 90;
const DEFAULT_DAYS = 30;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordView(publicationId: string, postSlug?: string): Promise<void> {
    let postId: string | null = null;
    if (postSlug) {
      const post = await this.prisma.post.findFirst({
        where: { publicationId, slug: postSlug, deletedAt: null },
        select: { id: true },
      });
      if (!post) return;
      postId = post.id;
    }

    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);

    if (postId) {
      await this.prisma.analyticsDailyRollup.upsert({
        where: { publicationId_postId_date: { publicationId, postId, date: day } },
        create: { publicationId, postId, date: day, views: 1 },
        update: { views: { increment: 1 } },
      });
      return;
    }

    // Publication home page view (postId = null). Postgres treats NULL as
    // distinct in unique indexes, so a plain upsert can't target this row;
    // find-then-create/update instead (best-effort, not perfectly atomic).
    const existing = await this.prisma.analyticsDailyRollup.findFirst({
      where: { publicationId, postId: null, date: day },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.analyticsDailyRollup.update({
        where: { id: existing.id },
        data: { views: { increment: 1 } },
      });
    } else {
      await this.prisma.analyticsDailyRollup.create({
        data: { publicationId, postId: null, date: day, views: 1 },
      });
    }
  }

  async getRollupForOwner(userId: string, publicationId: string, days: number) {
    const pub = await this.prisma.publication.findFirst({ where: { id: publicationId, userId, deletedAt: null } });
    if (!pub) throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));

    const clampedDays = Math.min(Math.max(days || DEFAULT_DAYS, 1), MAX_DAYS);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - clampedDays + 1);

    const rows = await this.prisma.analyticsDailyRollup.findMany({
      where: { publicationId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    const byDate = new Map<string, number>();
    for (const row of rows) {
      const key = row.date.toISOString().slice(0, 10);
      byDate.set(key, (byDate.get(key) ?? 0) + row.views);
    }

    const data: { date: string; views: number }[] = [];
    for (let i = 0; i < clampedDays; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      data.push({ date: key, views: byDate.get(key) ?? 0 });
    }

    const totalViews = data.reduce((sum, d) => sum + d.views, 0);
    const avgPerDay = clampedDays > 0 ? totalViews / clampedDays : 0;

    return { data, meta: { totalViews, avgPerDay } };
  }

  async getPostStatsForOwner(userId: string, publicationId: string, postSlug: string) {
    const pub = await this.prisma.publication.findFirst({ where: { id: publicationId, userId, deletedAt: null } });
    if (!pub) throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));

    const post = await this.prisma.post.findFirst({ where: { publicationId, slug: postSlug, deletedAt: null } });
    if (!post) throw new NotFoundException(JSON.stringify({ code: 'post_not_found' }));

    const rows = await this.prisma.analyticsDailyRollup.findMany({
      where: { publicationId, postId: post.id },
      orderBy: { date: 'asc' },
    });

    const totalViews = rows.reduce((sum, r) => sum + r.views, 0);
    return { data: rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), views: r.views })), meta: { totalViews } };
  }
}
