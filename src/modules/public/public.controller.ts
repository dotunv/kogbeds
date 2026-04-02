import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  renderBlogHomeHtml,
  renderPostHtml,
} from '../../common/utils/html.util';
import { PublicRequestContext } from './public-request-context.interface';
import { PublicService } from './public.service';

type RequestWithPublicContext = Request & {
  publicContext?: PublicRequestContext;
};

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('feed.xml')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  async feedXml(@Req() req: RequestWithPublicContext): Promise<string> {
    const context = this.getContextOrThrow(req);
    const blog = this.getBlogOrThrow(req);
    const siteBaseUrl = `${context.scheme}://${context.hostname}`;
    return this.publicService.renderFeedXml({ blog, siteBaseUrl });
  }

  @Get(':slug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async postPage(
    @Req() req: RequestWithPublicContext,
    @Param('slug') slug: string,
  ): Promise<string> {
    const blog = this.getBlogOrThrow(req);
    const post = await this.publicService.getPublishedPostBySlug(blog.id, slug);

    return renderPostHtml({
      blogTitle: blog.title,
      blogDescription: blog.description,
      customCss: blog.customCss,
      post,
    });
  }

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async blogHome(@Req() req: RequestWithPublicContext): Promise<string> {
    const blog = this.getBlogOrThrow(req);
    const posts = await this.publicService.getPublishedPosts(blog.id);

    return renderBlogHomeHtml({
      blogTitle: blog.title,
      blogDescription: blog.description,
      customCss: blog.customCss,
      posts,
    });
  }

  private getContextOrThrow(
    req: RequestWithPublicContext,
  ): PublicRequestContext {
    if (!req.publicContext) {
      throw new NotFoundException('Public blog not found');
    }

    return req.publicContext;
  }

  private getBlogOrThrow(
    req: RequestWithPublicContext,
  ): NonNullable<PublicRequestContext['blog']> {
    const context = this.getContextOrThrow(req);
    if (!context.blog) {
      throw new NotFoundException('Public blog not found');
    }
    return context.blog;
  }
}
