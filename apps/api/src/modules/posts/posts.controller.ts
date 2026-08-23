import {
  Body,
  Controller,
  Delete,
  Patch,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Publication } from '@prisma/client';
import { CurrentPublication } from '../../common/decorators/publication.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts.query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { SchedulePostDto } from './dto/schedule-post.dto';
import { PostsService } from './posts.service';

function requirePublication(publication: Publication | null): Publication {
  if (!publication) {
    throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));
  }
  return publication;
}

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(
    @CurrentPublication() publication: Publication | null,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.createForPublication(requirePublication(publication), userId, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(
    @CurrentPublication() publication: Publication | null,
    @CurrentUser('id') userId: string | undefined,
    @Query() query: ListPostsQueryDto,
  ) {
    return this.postsService.listForPublication(requirePublication(publication), userId, query);
  }

  @Get(':slug/revisions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listRevisions(
    @CurrentPublication() publication: Publication | null,
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
  ) {
    return this.postsService.listRevisionsForOwner(requirePublication(publication), userId, slug);
  }

  @Get(':slug/revisions/:n')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getRevision(
    @CurrentPublication() publication: Publication | null,
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Param('n', ParseIntPipe) n: number,
  ) {
    return this.postsService.getRevisionForOwner(requirePublication(publication), userId, slug, n);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  getBySlug(
    @CurrentPublication() publication: Publication | null,
    @CurrentUser('id') userId: string | undefined,
    @Param('slug') slug: string,
  ) {
    return this.postsService.getBySlug(requirePublication(publication), userId, slug);
  }

  @Post(':slug/schedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  schedule(
    @CurrentPublication() publication: Publication | null,
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() dto: SchedulePostDto,
  ) {
    return this.postsService.scheduleForOwner(requirePublication(publication), userId, slug, dto.scheduledAt);
  }

  @Post(':slug/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  publish(
    @CurrentPublication() publication: Publication | null,
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
  ) {
    return this.postsService.publishForOwner(requirePublication(publication), userId, slug);
  }

  @Post(':slug/unpublish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  unpublish(
    @CurrentPublication() publication: Publication | null,
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
  ) {
    return this.postsService.unpublishForOwner(requirePublication(publication), userId, slug);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(
    @CurrentPublication() publication: Publication | null,
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
  ) {
    return this.postsService.softDeleteForOwner(requirePublication(publication), userId, slug);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @CurrentPublication() publication: Publication | null,
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.updateForOwner(requirePublication(publication), userId, slug, dto);
  }
}
