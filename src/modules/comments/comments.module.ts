import { Module } from '@nestjs/common';
import { CommentsModerationController } from './comments-moderation.controller';
import { CommentsService } from './comments.service';

@Module({
  controllers: [CommentsModerationController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
