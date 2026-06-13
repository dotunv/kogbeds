import { Module } from '@nestjs/common';
import { EbooksController } from './ebooks.controller';
import { EbooksService } from './ebooks.service';

@Module({
  controllers: [EbooksController],
  providers: [EbooksService],
  exports: [EbooksService],
})
export class EbooksModule {}
