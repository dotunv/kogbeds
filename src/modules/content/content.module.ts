import { Module } from '@nestjs/common';
import { ContentRendererService } from './content-renderer.service';

@Module({
  providers: [ContentRendererService],
  exports: [ContentRendererService],
})
export class ContentModule {}
