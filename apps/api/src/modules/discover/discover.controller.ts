import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  renderDiscoverFeedXml,
  renderDiscoverHtml,
  renderRobotsTxt,
  renderUrlSetXml,
} from '../../common/utils/html.util';
import { PublicRequestContext } from '../public/public-request-context.interface';
import { DiscoverService } from './discover.service';

type RequestWithPublicContext = Request & {
  publicContext?: PublicRequestContext;
};

@ApiTags('discover')
@Controller('discover')
export class DiscoverController {
  constructor(
    private readonly discoverService: DiscoverService,
    private readonly config: ConfigService,
  ) {}

  private tenantDomain(hostname: string): string {
    const fromEnv = this.config.get<string>('APP_DOMAIN');
    const raw = (fromEnv ?? hostname).toLowerCase();
    return raw.replace(/^www\./, '');
  }

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async discoverHome(
    @Req() req: RequestWithPublicContext,
    @Query('tag') tag?: string,
  ): Promise<string> {
    const context = req.publicContext;
    if (!context?.isRootHost) {
      throw new NotFoundException();
    }

    const items = await this.discoverService.listRecentPublicPosts(100, tag);
    const canonicalUrl = `${context.scheme}://${context.hostname}`;
    return renderDiscoverHtml({
      appDomain: this.tenantDomain(context.hostname),
      posts: items,
      canonicalUrl,
    });
  }

  @Get('feed.xml')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  async discoverFeed(@Req() req: RequestWithPublicContext): Promise<string> {
    const context = req.publicContext;
    if (!context?.isRootHost) {
      throw new NotFoundException();
    }

    const items = await this.discoverService.listRecentPublicPosts();
    const siteBaseUrl = `${context.scheme}://${context.hostname}`;
    return renderDiscoverFeedXml({
      siteBaseUrl,
      appDomain: this.tenantDomain(context.hostname),
      items,
    });
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async rootSitemap(@Req() req: RequestWithPublicContext): Promise<string> {
    const context = req.publicContext;
    if (!context?.isRootHost) {
      throw new NotFoundException();
    }

    const urls = await this.discoverService.listUrlsForRootSitemap(
      this.tenantDomain(context.hostname),
    );
    return renderUrlSetXml(urls);
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robots(@Req() req: RequestWithPublicContext): string {
    const context = req.publicContext;
    if (!context?.isRootHost) {
      throw new NotFoundException();
    }

    const siteBaseUrl = `${context.scheme}://${context.hostname}`;
    return renderRobotsTxt({
      siteBaseUrl,
      sitemapUrl: `${siteBaseUrl}/sitemap.xml`,
    });
  }
}
