import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as he from 'he';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { newsletterTemplate } from '../mail/templates/newsletter.template';
import { confirmSubscriptionTemplate } from '../mail/templates/confirm-subscription.template';
import { welcomeSubscriberTemplate } from '../mail/templates/welcome-subscriber.template';
import { commentNotificationTemplate } from '../mail/templates/comment-notification.template';
import { GRIZZLY_QUEUE, JobName } from './queue.constants';
import { PostsService } from '../posts/posts.service';

export interface NewsletterSendPayload {
  postId: string;
  publicationId: string;
}
export interface SubscriberConfirmPayload {
  subscriberId: string;
}
export interface SubscriberWelcomePayload {
  subscriberId: string;
}
export interface CommentNotifyPayload {
  commentId: string;
}

@Processor(GRIZZLY_QUEUE)
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly postsService: PostsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JobName.NEWSLETTER_SEND:
        return this.handleNewsletterSend(job.data as NewsletterSendPayload);
      case JobName.SUBSCRIBER_CONFIRM:
        return this.handleSubscriberConfirm(job.data as SubscriberConfirmPayload);
      case JobName.SUBSCRIBER_WELCOME:
        return this.handleSubscriberWelcome(job.data as SubscriberWelcomePayload);
      case JobName.COMMENT_NOTIFY:
        return this.handleCommentNotify(job.data as CommentNotifyPayload);
      case JobName.POST_SCHEDULE:
        return this.handlePostSchedule(job.data as { postId: string });
      default:
        return;
    }
  }

  private rootUrl(): string {
    return this.config.get<string>('ROOT_URL') ?? 'http://localhost:3000';
  }

  private rootDomain(): string {
    return this.config.get<string>('ROOT_DOMAIN') ?? 'localhost';
  }

  private publicationUrl(slug: string): string {
    const rootUrl = this.rootUrl();
    try {
      const u = new URL(rootUrl);
      return `${u.protocol}//${slug}.${this.rootDomain()}`;
    } catch {
      return `https://${slug}.${this.rootDomain()}`;
    }
  }

  private async handleNewsletterSend(data: NewsletterSendPayload): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: data.postId },
      include: { publication: true },
    });
    if (!post) return;

    const subscribers = await this.prisma.subscriber.findMany({
      where: { publicationId: data.publicationId, confirmed: true },
    });

    let sent = 0;
    for (const subscriber of subscribers) {
      try {
        const postUrl = `${this.publicationUrl(post.publication.slug)}/${post.slug}`;
        const unsubscribeUrl = `${this.rootUrl()}/subscribe/unsubscribe?token=${subscriber.unsubToken}`;
        const { subject, html, text } = newsletterTemplate({
          publicationTitle: post.publication.title,
          postTitle: post.title,
          postExcerpt: post.excerpt,
          postUrl,
          unsubscribeUrl,
        });
        await this.mail.send(subscriber.email, subject, html, text);
        sent++;
      } catch (error) {
        this.logger.error(`Failed to send newsletter to subscriber ${subscriber.id}`, error instanceof Error ? error.stack : String(error));
      }
    }
    this.logger.log(`newsletter.send: sent ${sent}/${subscribers.length} for post ${post.id}`);
  }

  private async handleSubscriberConfirm(data: SubscriberConfirmPayload): Promise<void> {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id: data.subscriberId },
      include: { publication: true },
    });
    if (!subscriber) return;

    const confirmUrl = `${this.rootUrl()}/subscribe/confirm?token=${subscriber.confirmToken}`;
    const { subject, html, text } = confirmSubscriptionTemplate({
      publicationTitle: subscriber.publication.title,
      confirmUrl,
    });
    await this.mail.send(subscriber.email, subject, html, text);
  }

  private async handleSubscriberWelcome(data: SubscriberWelcomePayload): Promise<void> {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id: data.subscriberId },
      include: { publication: true },
    });
    if (!subscriber) return;

    const recentPosts = await this.prisma.post.findMany({
      where: { publicationId: subscriber.publicationId, status: 'PUBLISHED', deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: 3,
    });

    const unsubscribeUrl = `${this.rootUrl()}/subscribe/unsubscribe?token=${subscriber.unsubToken}`;
    const { subject, html, text } = welcomeSubscriberTemplate({
      publicationTitle: subscriber.publication.title,
      publicationDescription: subscriber.publication.description,
      recentPosts: recentPosts.map((p) => ({
        title: p.title,
        url: `${this.publicationUrl(subscriber.publication.slug)}/${p.slug}`,
      })),
      unsubscribeUrl,
    });
    await this.mail.send(subscriber.email, subject, html, text);
  }

  private async handlePostSchedule(data: { postId: string }): Promise<void> {
    await this.postsService.publishIfStillScheduled(data.postId);
  }

  private async handleCommentNotify(data: CommentNotifyPayload): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: data.commentId },
      include: { post: { include: { publication: { include: { user: true } } } } },
    });
    if (!comment) return;

    const owner = comment.post.publication.user;
    const moderationUrl = `${this.rootUrl()}/comments/pending`;
    const { subject, html, text } = commentNotificationTemplate({
      postTitle: comment.post.title,
      authorName: he.decode(comment.authorName ?? 'Anonymous'),
      commentBody: he.decode(comment.body),
      moderationUrl,
    });
    await this.mail.send(owner.email, subject, html, text);
  }
}
