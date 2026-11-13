import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ListPostsQueryDto } from './dto/list-posts.query.dto';
import { SchedulePostDto } from './dto/schedule-post.dto';
import { PostsService, PostWithTags } from './posts.service';

function presentPost(post: PostWithTags) {
  return { ...post, tags: post.tags.map(({ tag }) => ({ id: tag.id, name: tag.name })) };
}

/** Dashboard routes identify the publication explicitly and require ownership. */
@Controller('publications/:publicationSlug/posts')
export class PublicationPostsController {
  constructor(private readonly prisma: PrismaService, private readonly posts: PostsService) {}

  private async publication(slug: string, userId: string) {
    const publication = await this.prisma.publication.findFirst({ where: { slug, userId, deletedAt: null } });
    if (!publication) throw new NotFoundException('Publication not found');
    return publication;
  }

  private async readablePublication(slug: string) {
    const publication = await this.prisma.publication.findFirst({ where: { slug, deletedAt: null } });
    if (!publication) throw new NotFoundException('Publication not found');
    return publication;
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async list(@Param('publicationSlug') slug: string, @CurrentUser('id') userId: string | undefined, @Query() query: ListPostsQueryDto) {
    const result = await this.posts.listForPublication(await this.readablePublication(slug), userId, query);
    return { ...result, data: result.data.map(presentPost) };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Param('publicationSlug') slug: string, @CurrentUser('id') userId: string, @Body() dto: CreatePostDto) {
    return presentPost(await this.posts.createForPublication(await this.publication(slug, userId), userId, dto));
  }

  @Get(':postSlug')
  @UseGuards(OptionalJwtAuthGuard)
  async get(@Param('publicationSlug') slug: string, @Param('postSlug') postSlug: string, @CurrentUser('id') userId: string | undefined) {
    return presentPost(await this.posts.getBySlug(await this.readablePublication(slug), userId, postSlug));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':postSlug')
  async update(@Param('publicationSlug') slug: string, @Param('postSlug') postSlug: string, @CurrentUser('id') userId: string, @Body() dto: UpdatePostDto) {
    return presentPost(await this.posts.updateForOwner(await this.publication(slug, userId), userId, postSlug, dto));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':postSlug/publish')
  async publish(@Param('publicationSlug') slug: string, @Param('postSlug') postSlug: string, @CurrentUser('id') userId: string) {
    return presentPost(await this.posts.publishForOwner(await this.publication(slug, userId), userId, postSlug));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':postSlug/schedule')
  async schedule(@Param('publicationSlug') slug: string, @Param('postSlug') postSlug: string, @CurrentUser('id') userId: string, @Body() dto: SchedulePostDto) {
    return presentPost(await this.posts.scheduleForOwner(await this.publication(slug, userId), userId, postSlug, dto.scheduledAt));
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':postSlug')
  async delete(@Param('publicationSlug') slug: string, @Param('postSlug') postSlug: string, @CurrentUser('id') userId: string) {
    return this.posts.softDeleteForOwner(await this.publication(slug, userId), userId, postSlug);
  }
}
