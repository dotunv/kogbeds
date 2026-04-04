import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type DiscoverPostItem = {
  id: string;
  title: string;
  slug: string;
  publishedAt: Date | null;
  updatedAt: Date;
  blog: {
    title: string;
    username: string;
  };
};

@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecentPublicPosts(
    limit = 100,
    tagSlug?: string,
  ): Promise<DiscoverPostItem[]> {
    const tagFilter = tagSlug?.trim()
      ? {
          tags: {
            some: {
              tag: { slug: tagSlug.trim().toLowerCase() },
            },
          },
        }
      : {};

    const posts = await this.prisma.post.findMany({
      where: {
        isPublished: true,
        blog: {
          isPublic: true,
        },
        ...tagFilter,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        updatedAt: true,
        blog: {
          select: {
            title: true,
            owner: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });

    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      blog: {
        title: post.blog.title,
        username: post.blog.owner.username,
      },
    }));
  }

  async listUrlsForRootSitemap(
    appDomain: string,
  ): Promise<{ loc: string; lastmod: string }[]> {
    const posts = await this.prisma.post.findMany({
      where: {
        isPublished: true,
        blog: { isPublic: true },
      },
      select: {
        slug: true,
        updatedAt: true,
        blog: {
          select: {
            owner: { select: { username: true } },
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 5000,
    });

    return posts.map((p) => ({
      loc: `https://${p.blog.owner.username}.${appDomain}/${p.slug}`,
      lastmod: p.updatedAt.toISOString().slice(0, 10),
    }));
  }
}
