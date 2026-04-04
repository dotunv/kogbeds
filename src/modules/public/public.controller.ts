import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import {
  renderBlogHomeHtml,
  renderPostHtml,
  renderUrlSetXml,
} from '../../common/utils/html.util';
import { AnalyticsService } from '../analytics/analytics.service';
import { CommentsService } from '../comments/comments.service';
import { CreatePublicCommentDto } from '../comments/dto/create-public-comment.dto';
import { SubscribeNewsletterDto } from '../newsletter/dto/subscribe-newsletter.dto';
import { NewsletterService } from '../newsletter/newsletter.service';
import { PublicRequestContext } from './public-request-context.interface';
import { PublicService } from './public.service';

type RequestWithPublicContext = Request & {
  publicContext?: PublicRequestContext;
};

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly newsletter: NewsletterService,
    private readonly comments: CommentsService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get('domain-challenge')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  domainChallenge(@Req() req: RequestWithPublicContext): string {
    const context = this.getContextOrThrow(req);
    const token = context.domainChallengeToken;
    if (!token) {
      throw new NotFoundException();
    }
    return token;
  }

  @Post('newsletter/subscribe')
  @Header('Content-Type', 'application/json')
  async newsletterSubscribe(
    @Req() req: RequestWithPublicContext,
    @Body() dto: SubscribeNewsletterDto,
  ): Promise<{ status: string }> {
    const blog = this.getBlogOrThrow(req);
    const context = this.getContextOrThrow(req);
    const siteBaseUrl = `${context.scheme}://${context.hostname}`;
    return this.newsletter.subscribe(blog.id, dto.email, siteBaseUrl);
  }

  @Get('newsletter/confirm')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async newsletterConfirm(@Query('t') token: string): Promise<string> {
    if (!token) {
      throw new NotFoundException();
    }
    await this.newsletter.confirmByToken(token);
    return '<!doctype html><html><body><p>Subscription confirmed. You can close this tab.</p></body></html>';
  }

  @Get('newsletter/unsubscribe')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async newsletterUnsubscribe(@Query('t') token: string): Promise<string> {
    if (!token) {
      throw new NotFoundException();
    }
    await this.newsletter.unsubscribeByToken(token);
    return '<!doctype html><html><body><p>You have been unsubscribed.</p></body></html>';
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async blogSitemap(@Req() req: RequestWithPublicContext): Promise<string> {
    const blog = this.getBlogOrThrow(req);
    const context = this.getContextOrThrow(req);
    const base = `${context.scheme}://${context.hostname}`;
    const rows = await this.publicService.listPublishedSlugsForSitemap(blog.id);
    const urls = rows.map((r) => ({
      loc: `${base}/${r.slug}`,
      lastmod: r.updatedAt.toISOString().slice(0, 10),
    }));
    urls.unshift({
      loc: `${base}/`,
      lastmod: new Date().toISOString().slice(0, 10),
    });
    return renderUrlSetXml(urls);
  }

  @Get('feed.xml')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  async feedXml(@Req() req: RequestWithPublicContext): Promise<string> {
    const context = this.getContextOrThrow(req);
    const blog = this.getBlogOrThrow(req);
    const siteBaseUrl = `${context.scheme}://${context.hostname}`;
    return this.publicService.renderFeedXml({ blog, siteBaseUrl });
  }

  @Get(':slug/comments')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async listComments(
    @Req() req: RequestWithPublicContext,
    @Param('slug') slug: string,
  ) {
    const blog = this.getBlogOrThrow(req);
    const post = await this.publicService.getPublishedPostBySlug(blog.id, slug);
    return this.comments.listApprovedForPost(post.id);
  }

  @Post(':slug/comments')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async addComment(
    @Req() req: RequestWithPublicContext,
    @Param('slug') slug: string,
    @Body() dto: CreatePublicCommentDto,
  ) {
    const blog = this.getBlogOrThrow(req);
    const post = await this.publicService.getPublishedPostBySlug(blog.id, slug);
    return this.comments.createPending(post.id, dto);
  }

  @Get(':slug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async postPage(
    @Req() req: RequestWithPublicContext,
    @Param('slug') slug: string,
  ): Promise<string> {
    const context = this.getContextOrThrow(req);
    const blog = this.getBlogOrThrow(req);
    const post = await this.publicService.getPublishedPostBySlug(blog.id, slug);
    const comments = await this.comments.listApprovedForPost(post.id);

    void this.analytics
      .recordPageView({ blogId: blog.id, postId: post.id })
      .catch(() => undefined);

    const canonicalUrl = `${context.scheme}://${context.hostname}/${post.slug}`;
    return renderPostHtml({
      blogTitle: blog.title,
      blogDescription: blog.description,
      customCss: blog.customCss,
      canonicalUrl,
      post: {
        title: post.title,
        contentHtml: post.contentHtml,
        contentMarkdown: post.contentMarkdown,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        excerpt: post.excerpt,
      },
      comments,
    });
  }

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async blogHome(@Req() req: RequestWithPublicContext): Promise<string> {
    const context = this.getContextOrThrow(req);
    const blog = this.getBlogOrThrow(req);
    const posts = await this.publicService.getPublishedPosts(blog.id);

    void this.analytics
      .recordPageView({ blogId: blog.id, postId: '' })
      .catch(() => undefined);

    const canonicalUrl = `${context.scheme}://${context.hostname}/`;
    return renderBlogHomeHtml({
      blogTitle: blog.title,
      blogDescription: blog.description,
      customCss: blog.customCss,
      canonicalUrl,
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
