import { Injectable } from '@nestjs/common';
import { PostStatus, PublicationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface DiscoverPostItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: Date | null;
  tags: string[];
  publication: { slug: string; title: string; accentColor: string };
}

const MAX_LIMIT = 20;

@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecentPosts(opts: { tag?: string; page: number; limit: number }): Promise<{
    data: DiscoverPostItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const limit = Math.min(opts.limit || MAX_LIMIT, MAX_LIMIT);
    const page = Math.max(opts.page || 1, 1);

    const where = {
      status: PostStatus.PUBLISHED,
      deletedAt: null,
      publication: {
        isPublic: true,
        deletedAt: null,
        type: { in: [PublicationType.BLOG, PublicationType.BOTH] as PublicationType[] },
      },
      ...(opts.tag ? { tags: { some: { tag: { name: opts.tag.trim().toLowerCase() } } } } : {}),
    };

    const [total, posts] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tags: { include: { tag: true } },
          publication: { select: { slug: true, title: true, accentColor: true } },
        },
      }),
    ]);

    return {
      data: posts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        publishedAt: p.publishedAt,
        tags: p.tags.map((t) => t.tag.name),
        publication: p.publication,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async listTags(): Promise<string[]> {
    const tags = await this.prisma.tag.findMany({
      where: {
        posts: {
          some: {
            post: {
              status: PostStatus.PUBLISHED,
              deletedAt: null,
              publication: {
                isPublic: true,
                deletedAt: null,
                type: { in: [PublicationType.BLOG, PublicationType.BOTH] },
              },
            },
          },
        },
      },
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    });
    return [...new Set(tags.map((t) => t.name))];
  }
}
