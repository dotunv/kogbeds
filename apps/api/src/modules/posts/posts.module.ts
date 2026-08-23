import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostPublishedListener } from './listeners/post-published.listener';

@Module({
  controllers: [PostsController],
  providers: [PostsService, PostPublishedListener],
  exports: [PostsService],
})
export class PostsModule {}
