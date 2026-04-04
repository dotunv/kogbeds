import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomBytes } from 'crypto';
import { NewsletterSubscriberStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

export const EMAIL_QUEUE = 'email' as const;

export type NewsletterConfirmJob = {
  type: 'newsletter-confirm';
  subscriberId: string;
  confirmUrl: string;
  blogTitle: string;
};

export type PostPublishedEmailJob = {
  type: 'post-published';
  blogId: string;
  postId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  blogUsername: string;
  siteBaseUrl: string;
};

export type EmailJobData = NewsletterConfirmJob | PostPublishedEmailJob;

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobData>,
  ) {}

  async subscribe(
    blogId: string,
    emailRaw: string,
    siteBaseUrl: string,
  ): Promise<{ status: string }> {
    const email = emailRaw.trim().toLowerCase();
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: {
        blogId_email: { blogId, email },
      },
    });

    if (existing?.status === NewsletterSubscriberStatus.ACTIVE) {
      return { status: 'already_subscribed' };
    }

    const confirmToken = randomBytes(32).toString('hex');
    const unsubToken = randomBytes(32).toString('hex');

    const subscriber = await this.prisma.newsletterSubscriber.upsert({
      where: {
        blogId_email: { blogId, email },
      },
      create: {
        blogId,
        email,
        status: NewsletterSubscriberStatus.PENDING,
        confirmToken,
        unsubToken,
      },
      update: {
        status: NewsletterSubscriberStatus.PENDING,
        confirmToken,
        unsubToken,
      },
    });

    const blog = await this.prisma.blog.findUniqueOrThrow({
      where: { id: blogId },
    });

    const confirmUrl = `${siteBaseUrl.replace(/\/$/, '')}/public/newsletter/confirm?t=${subscriber.confirmToken}`;

    await this.emailQueue.add(
      'send',
      {
        type: 'newsletter-confirm',
        subscriberId: subscriber.id,
        confirmUrl,
        blogTitle: blog.title,
      } satisfies NewsletterConfirmJob,
      { removeOnComplete: 100 },
    );

    return { status: 'pending_confirmation' };
  }

  async confirmByToken(token: string): Promise<{ ok: true }> {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { confirmToken: token },
    });
    if (!subscriber) {
      throw new NotFoundException('Invalid or expired confirmation link');
    }
    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: NewsletterSubscriberStatus.ACTIVE },
    });
    return { ok: true };
  }

  async unsubscribeByToken(token: string): Promise<{ ok: true }> {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { unsubToken: token },
    });
    if (!subscriber) {
      throw new NotFoundException('Invalid unsubscribe link');
    }
    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: NewsletterSubscriberStatus.UNSUBSCRIBED },
    });
    return { ok: true };
  }

  async processPostPublishedJob(data: PostPublishedEmailJob): Promise<void> {
    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      where: {
        blogId: data.blogId,
        status: NewsletterSubscriberStatus.ACTIVE,
      },
    });

    const postUrl = `${data.siteBaseUrl.replace(/\/$/, '')}/${data.slug}`;
    const subject = `New post: ${data.title}`;

    for (const sub of subscribers) {
      const unsubUrl = `${data.siteBaseUrl.replace(/\/$/, '')}/public/newsletter/unsubscribe?t=${sub.unsubToken}`;
      const text = `${data.title}\n\n${data.excerpt ?? ''}\n\nRead: ${postUrl}\n\nUnsubscribe: ${unsubUrl}`;
      await this.mail.sendMail({
        to: sub.email,
        subject,
        text,
      });
    }
  }

  async processNewsletterConfirmJob(data: NewsletterConfirmJob): Promise<void> {
    const sub = await this.prisma.newsletterSubscriber.findUnique({
      where: { id: data.subscriberId },
    });
    if (!sub || sub.status !== NewsletterSubscriberStatus.PENDING) {
      return;
    }
    await this.mail.sendMail({
      to: sub.email,
      subject: `Confirm your subscription to ${data.blogTitle}`,
      text: `Click to confirm your newsletter subscription:\n${data.confirmUrl}\n\nIf you did not request this, ignore this email.`,
    });
  }
}
