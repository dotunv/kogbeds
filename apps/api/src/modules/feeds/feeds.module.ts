import { Module } from '@nestjs/common';
import { FeedsController } from './feeds.controller';

@Module({
  controllers: [FeedsController],
})
export class FeedsModule {}
