import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CommentsModule } from '../comments/comments.module';
import { NewsletterModule } from '../newsletter/newsletter.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [NewsletterModule, CommentsModule, AnalyticsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
