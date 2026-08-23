import { Controller, Get, Header, NotFoundException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Publication, PublicationType } from '@prisma/client';
import { CurrentPublication } from '../../common/decorators/publication.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiExcludeController()
@Controller()
export class FeedsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private publicationUrl(pub: Publication): string {
    if (pub.customDomain && pub.domainVerified) {
      return `https://${pub.customDomain}`;
    }
    const rootDomain = this.config.get<string>('ROOT_DOMAIN') ?? 'localhost';
    return `https://${pub.slug}.${rootDomain}`;
  }

  private assertBlogPublication(pub: Publication | null): Publication {
    if (!pub) {
      throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));
    }
    if (pub.type === PublicationType.NEWSLETTER) {
      throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));
    }
    return pub;
  }

  @Get('rss.xml')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  async rss(@CurrentPublication() publication: Publication | null): Promise<string> {
    const pub = this.assertBlogPublication(publication);
    const baseUrl = this.publicationUrl(pub);

    const posts = await this.prisma.post.findMany({
      where: { publicationId: pub.id, status: 'PUBLISHED', deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    });

    const items = posts
      .map((post) => {
        const url = `${baseUrl}/${post.slug}`;
        return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>
      <guid>${escapeXml(url)}</guid>
    </item>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(pub.title)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(pub.description)}</description>
    <language>en</language>${items}
  </channel>
</rss>`;
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async sitemap(@CurrentPublication() publication: Publication | null): Promise<string> {
    const pub = this.assertBlogPublication(publication);
    const baseUrl = this.publicationUrl(pub);

    const posts = await this.prisma.post.findMany({
      where: { publicationId: pub.id, status: 'PUBLISHED', deletedAt: null },
      orderBy: { publishedAt: 'desc' },
    });

    const urls = [
      `<url><loc>${escapeXml(baseUrl)}</loc></url>`,
      ...posts.map(
        (post) =>
          `<url><loc>${escapeXml(`${baseUrl}/${post.slug}`)}</loc><lastmod>${post.updatedAt
            .toISOString()
            .slice(0, 10)}</lastmod></url>`,
      ),
    ].join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robots(@CurrentPublication() publication: Publication | null): string {
    if (!publication) {
      throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));
    }
    const disallow = !publication.isPublic || publication.type === PublicationType.NEWSLETTER;
    if (disallow) {
      return 'User-agent: *\nDisallow: /\n';
    }
    const baseUrl = this.publicationUrl(publication);
    return `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`;
  }
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
