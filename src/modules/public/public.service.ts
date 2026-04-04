import { Injectable, NotFoundException } from '@nestjs/common';
import { Post } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { escapeHtml } from '../../common/utils/html.util';

type PublicPostSummary = Pick<
  Post,
  'id' | 'title' | 'slug' | 'publishedAt' | 'createdAt' | 'updatedAt'
> & {
  featuredImageUrl: string | null;
};

type PublicPostDetail = Pick<
  Post,
  | 'id'
  | 'title'
  | 'slug'
  | 'contentHtml'
  | 'contentMarkdown'
  | 'publishedAt'
  | 'createdAt'
  | 'updatedAt'
  | 'featuredImageUrl'
> & {
  excerpt: string | null;
  searchableText: string | null;
};

export type PublicBlogView = {
  id: string;
  title: string;
  description: string | null;
  customCss: string | null;
  isPublic: boolean;
  username: string;
};

type FeedItem = {
  title: string;
  slug: string;
  publishedAt: Date | null;
  updatedAt: Date;
  description: string;
};

type FeedRenderInput = {
  blog: {
    id: string;
    title: string;
    description: string | null;
  };
  siteBaseUrl: string;
};

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getBlogByUsername(username: string): Promise<PublicBlogView | null> {
    const normalized = username.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const blog = await this.prisma.blog.findFirst({
      where: {
        isPublic: true,
        owner: {
          username: normalized,
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        customCss: true,
        owner: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!blog) {
      return null;
    }

    return {
      id: blog.id,
      title: blog.title,
      description: blog.description,
      customCss: blog.customCss,
      isPublic: true,
      username: blog.owner.username,
    };
  }

  async getBlogById(blogId: string): Promise<PublicBlogView> {
    const blog = await this.prisma.blog.findFirst({
      where: {
        id: blogId,
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        customCss: true,
        owner: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return {
      id: blog.id,
      title: blog.title,
      description: blog.description,
      customCss: blog.customCss,
      isPublic: true,
      username: blog.owner.username,
    };
  }

  async getPublishedPosts(blogId: string): Promise<PublicPostSummary[]> {
    return this.prisma.post.findMany({
      where: {
        blogId,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        featuredImageUrl: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getPublishedPostBySlug(
    blogId: string,
    slug: string,
  ): Promise<PublicPostDetail> {
    const post = await this.prisma.post.findFirst({
      where: {
        blogId,
        slug: slug.trim().toLowerCase(),
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        contentHtml: true,
        contentMarkdown: true,
        excerpt: true,
        searchableText: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        featuredImageUrl: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async renderFeedXml(input: FeedRenderInput): Promise<string> {
    const { blog, siteBaseUrl } = input;
    const posts = await this.prisma.post.findMany({
      where: {
        blogId: blog.id,
        isPublished: true,
      },
      select: {
        title: true,
        slug: true,
        publishedAt: true,
        updatedAt: true,
        contentMarkdown: true,
        excerpt: true,
        searchableText: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    const feedItems = posts.map<FeedItem>((post) => ({
      title: post.title,
      slug: post.slug,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      description:
        post.excerpt ??
        post.searchableText?.slice(0, 280) ??
        post.contentMarkdown?.slice(0, 280) ??
        '',
    }));

    const channelTitle = escapeHtml(blog.title);
    const channelDescription = escapeHtml(
      blog.description ?? `Posts from ${blog.title}`,
    );
    const channelLink = escapeHtml(siteBaseUrl);

    const itemsXml = feedItems
      .map((post) => {
        const postUrl = `${siteBaseUrl}/${post.slug}`;
        const pubDate = (post.publishedAt ?? post.updatedAt).toUTCString();
        return `<item>
  <title>${escapeHtml(post.title)}</title>
  <link>${escapeHtml(postUrl)}</link>
  <guid>${escapeHtml(postUrl)}</guid>
  <pubDate>${escapeHtml(pubDate)}</pubDate>
  <description>${escapeHtml(post.description)}</description>
</item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${channelTitle}</title>
  <link>${channelLink}</link>
  <description>${channelDescription}</description>
  ${itemsXml}
</channel>
</rss>`;
  }

  async getBlogByCustomDomain(hostname: string): Promise<{
    blog: PublicBlogView;
    domainChallengeToken: string | null;
  } | null> {
    const host = hostname.trim().toLowerCase();
    const row = await this.prisma.blog.findFirst({
      where: {
        isPublic: true,
        customDomain: host,
      },
      select: {
        id: true,
        title: true,
        description: true,
        customCss: true,
        customDomainVerifyToken: true,
        owner: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      blog: {
        id: row.id,
        title: row.title,
        description: row.description,
        customCss: row.customCss,
        isPublic: true,
        username: row.owner.username,
      },
      domainChallengeToken: row.customDomainVerifyToken,
    };
  }

  async listPublishedSlugsForSitemap(
    blogId: string,
  ): Promise<{ slug: string; updatedAt: Date }[]> {
    return this.prisma.post.findMany({
      where: {
        blogId,
        isPublished: true,
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: [{ publishedAt: 'desc' }],
      take: 2000,
    });
  }
}
