import { Module } from '@nestjs/common';
import { BlogsModule } from '../blogs/blogs.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [BlogsModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
