import { Module } from '@nestjs/common';
import { PublicationPostsController } from './publication-posts.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostPublishedListener } from './listeners/post-published.listener';

@Module({
  controllers: [PostsController, PublicationPostsController],
  providers: [PostsService, PostPublishedListener],
  exports: [PostsService],
})
export class PostsModule {}
