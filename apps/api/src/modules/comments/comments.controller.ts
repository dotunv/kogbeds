import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Publication } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CurrentPublication } from '../../common/decorators/publication.decorator';
import { CreatePublicCommentDto } from './dto/create-public-comment.dto';
import { CommentsService } from './comments.service';

function requirePublication(publication: Publication | null): Publication {
  if (!publication) {
    throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));
  }
  return publication;
}

@ApiTags('comments')
@Controller('posts/:slug/comments')
export class PostCommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@CurrentPublication() publication: Publication | null, @Param('slug') slug: string) {
    return this.comments.listApprovedForPost(requirePublication(publication).id, slug);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentPublication() publication: Publication | null,
    @Param('slug') slug: string,
    @Body() dto: CreatePublicCommentDto,
  ) {
    return this.comments.createPending(requirePublication(publication).id, slug, dto);
  }
}
