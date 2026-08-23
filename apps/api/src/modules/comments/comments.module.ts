import { Module } from '@nestjs/common';
import { CommentsModerationController } from './comments-moderation.controller';
import { PostCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  controllers: [CommentsModerationController, PostCommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
