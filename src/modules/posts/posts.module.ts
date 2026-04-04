import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { BlogsModule } from '../blogs/blogs.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [BlogsModule, ContentModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
