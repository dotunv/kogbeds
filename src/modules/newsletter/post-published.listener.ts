import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  POST_PUBLISHED_EVENT,
  type PostPublishedPayload,
} from '../posts/events/post-published.event';
import { EMAIL_QUEUE, type PostPublishedEmailJob } from './newsletter.service';

@Injectable()
export class PostPublishedListener {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  @OnEvent(POST_PUBLISHED_EVENT)
  handlePostPublished(payload: PostPublishedPayload): void {
    const job: PostPublishedEmailJob = {
      type: 'post-published',
      blogId: payload.blogId,
      postId: payload.postId,
      title: payload.title,
      slug: payload.slug,
      excerpt: payload.excerpt,
      blogUsername: payload.blogUsername,
      siteBaseUrl: payload.siteBaseUrl,
    };
    void this.emailQueue.add('send', job, { removeOnComplete: 100 });
  }
}
