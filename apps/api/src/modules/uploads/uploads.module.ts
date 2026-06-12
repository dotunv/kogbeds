import { Module } from '@nestjs/common';
import { BlogsModule } from '../blogs/blogs.module';
import { StorageService } from './storage.service';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [BlogsModule],
  controllers: [UploadsController],
  providers: [StorageService],
  exports: [StorageService],
})
export class UploadsModule {}
