import { Module } from '@nestjs/common';
import { BlogsService } from './blogs.service';

@Module({
  providers: [BlogsService],
  exports: [BlogsService],
})
export class BlogsModule {}
