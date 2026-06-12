import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  EMAIL_QUEUE,
  NewsletterService,
  type EmailJobData,
} from './newsletter.service';

@Processor(EMAIL_QUEUE, { concurrency: 2 })
export class EmailQueueProcessor extends WorkerHost {
  constructor(private readonly newsletter: NewsletterService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    switch (job.data.type) {
      case 'post-published':
        await this.newsletter.processPostPublishedJob(job.data);
        break;
      case 'newsletter-confirm':
        await this.newsletter.processNewsletterConfirmJob(job.data);
        break;
      default: {
        const _exhaustive: never = job.data;
        return _exhaustive;
      }
    }
  }
}
