import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  renderDiscoverHtml,
  renderDiscoverFeedXml,
} from '../../common/utils/html.util';
import { PublicRequestContext } from '../public/public-request-context.interface';
import { DiscoverService } from './discover.service';

type RequestWithPublicContext = Request & {
  publicContext?: PublicRequestContext;
};

@Controller()
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async discoverHome(@Req() req: RequestWithPublicContext): Promise<string> {
    const context = req.publicContext;
    if (!context?.isRootHost) {
      throw new NotFoundException();
    }

    const items = await this.discoverService.listRecentPublicPosts();
    return renderDiscoverHtml({
      appDomain: context.hostname,
      posts: items,
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
      appDomain: context.hostname,
      items,
    });
  }
}
