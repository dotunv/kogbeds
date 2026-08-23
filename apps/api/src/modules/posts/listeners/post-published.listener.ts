import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { PublicationType } from '@prisma/client';
import { GRIZZLY_QUEUE, JobName, DEFAULT_JOB_OPTS } from '../../queue/queue.constants';
import { POST_PUBLISHED_EVENT } from '../events/post-published.event';
import type { PostPublishedPayload } from '../events/post-published.event';

@Injectable()
export class PostPublishedListener {
  constructor(@InjectQueue(GRIZZLY_QUEUE) private readonly queue: Queue) {}

  @OnEvent(POST_PUBLISHED_EVENT)
  async handlePostPublished(payload: PostPublishedPayload): Promise<void> {
    if (
      payload.publicationType !== PublicationType.NEWSLETTER &&
      payload.publicationType !== PublicationType.BOTH
    ) {
      return;
    }

    await this.queue.add(
      JobName.NEWSLETTER_SEND,
      { postId: payload.postId, publicationId: payload.publicationId },
      DEFAULT_JOB_OPTS,
    );
  }
}
