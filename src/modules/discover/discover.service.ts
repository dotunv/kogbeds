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

  async listRecentPublicPosts(limit = 100): Promise<DiscoverPostItem[]> {
    const posts = await this.prisma.post.findMany({
      where: {
        isPublished: true,
        blog: {
          isPublic: true,
        },
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
}
