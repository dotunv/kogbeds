import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts.query.dto';
import { PreviewPostDto } from './dto/preview-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@ApiTags('posts')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post('preview')
  preview(@CurrentUser('id') userId: string, @Body() dto: PreviewPostDto) {
    return this.postsService.previewForOwner(userId, dto);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePostDto) {
    return this.postsService.createForOwner(userId, dto);
  }

  @Get()
  list(@CurrentUser('id') userId: string, @Query() query: ListPostsQueryDto) {
    return this.postsService.listForOwner(userId, query);
  }

  @Get(':id/revisions')
  listRevisions(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.postsService.listRevisionsForOwner(userId, id);
  }

  @Get(':id')
  getById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.postsService.getByIdForOwner(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.updateForOwner(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.postsService.deleteForOwner(userId, id);
  }

  @Patch(':id/publish')
  publish(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.postsService.publishForOwner(userId, id);
  }

  @Patch(':id/unpublish')
  unpublish(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.postsService.unpublishForOwner(userId, id);
  }
}
