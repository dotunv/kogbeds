import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BlogsService } from './blogs.service';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PostsService } from '../posts/posts.service';
import { ListPostsQueryDto } from '../posts/dto/list-posts.query.dto';
import { CommentsService } from '../comments/comments.service';
import { CreatePublicCommentDto } from '../comments/dto/create-public-comment.dto';

@ApiTags('blogs')
@Controller('blogs')
export class BlogsController {
  constructor(
    private readonly blogsService: BlogsService,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMe(@CurrentUser('id') userId: string) {
    return this.blogsService.getForOwner(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  patchMe(@CurrentUser('id') userId: string, @Body() dto: UpdateBlogDto) {
    return this.blogsService.updateForOwner(userId, dto);
  }

  @Post('me/verify-custom-domain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  verifyCustomDomain(@CurrentUser('id') userId: string) {
    return this.blogsService.verifyCustomDomainForOwner(userId);
  }

  // ── Public blog endpoints ──────────────────────────────────────────────────

  @Get(':username')
  getPublicBlog(@Param('username') username: string) {
    return this.blogsService.findPublicByUsername(username);
  }

  @Get(':username/posts')
  getPublicPosts(
    @Param('username') username: string,
    @Query() query: ListPostsQueryDto,
  ) {
    return this.blogsService.findPublicByUsername(username).then((blog) =>
      this.postsService.listPublishedForBlog(blog.id, query),
    );
  }

  @Get(':username/posts/:slug')
  getPublicPost(
    @Param('username') username: string,
    @Param('slug') slug: string,
  ) {
    return this.blogsService.findPublicByUsername(username).then((blog) =>
      this.postsService.getPublishedBySlug(blog.id, slug),
    );
  }

  @Get(':username/posts/:slug/comments')
  getPublicComments(
    @Param('username') username: string,
    @Param('slug') slug: string,
  ) {
    return this.blogsService.findPublicByUsername(username)
      .then((blog) => this.postsService.getPublishedBySlug(blog.id, slug))
      .then((post) => this.commentsService.listApprovedForPost(post.id));
  }

  @Post(':username/posts/:slug/comments')
  createPublicComment(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Body() dto: CreatePublicCommentDto,
  ) {
    return this.blogsService.findPublicByUsername(username)
      .then((blog) => this.postsService.getPublishedBySlug(blog.id, slug))
      .then((post) => this.commentsService.createPending(post.id, dto));
  }
}
