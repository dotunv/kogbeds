import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from '../mail/mail.module';
import { EmailQueueProcessor } from './email-queue.processor';
import { NewsletterService, EMAIL_QUEUE } from './newsletter.service';
import { PostPublishedListener } from './post-published.listener';

@Module({
  imports: [
    MailModule,
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
    }),
  ],
  providers: [NewsletterService, PostPublishedListener, EmailQueueProcessor],
  exports: [NewsletterService],
})
export class NewsletterModule {}
