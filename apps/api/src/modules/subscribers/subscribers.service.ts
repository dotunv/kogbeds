import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PublicationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GRIZZLY_QUEUE, JobName, DEFAULT_JOB_OPTS } from '../queue/queue.constants';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class SubscribersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(GRIZZLY_QUEUE) private readonly queue: Queue,
  ) {}

  async subscribe(
    publicationId: string,
    publicationType: PublicationType,
    dto: SubscribeDto,
  ): Promise<{ message: string }> {
    if (publicationType === PublicationType.BLOG) {
      throw new NotFoundException(JSON.stringify({ code: 'publication_type_no_newsletter' }));
    }

    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.subscriber.findUnique({
      where: { publicationId_email: { publicationId, email } },
    });

    if (existing?.confirmed) {
      return { message: 'Check your email to confirm your subscription' };
    }

    if (existing) {
      await this.queue.add(JobName.SUBSCRIBER_CONFIRM, { subscriberId: existing.id }, DEFAULT_JOB_OPTS);
      return { message: 'Check your email to confirm your subscription' };
    }

    const created = await this.prisma.subscriber.create({ data: { publicationId, email } });
    await this.queue.add(JobName.SUBSCRIBER_CONFIRM, { subscriberId: created.id }, DEFAULT_JOB_OPTS);

    return { message: 'Check your email to confirm your subscription' };
  }

  async confirmByToken(token: string): Promise<{ message: string }> {
    const subscriber = await this.prisma.subscriber.findUnique({ where: { confirmToken: token } });
    if (!subscriber) {
      throw new BadRequestException(JSON.stringify({ code: 'subscriber_token_invalid' }));
    }
    await this.prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { confirmed: true, confirmedAt: new Date() },
    });

    await this.queue.add(JobName.SUBSCRIBER_WELCOME, { subscriberId: subscriber.id }, DEFAULT_JOB_OPTS);

    return { message: 'Subscription confirmed' };
  }

  async unsubscribeByToken(token: string): Promise<{ message: string }> {
    const subscriber = await this.prisma.subscriber.findUnique({ where: { unsubToken: token } });
    if (!subscriber) {
      throw new BadRequestException(JSON.stringify({ code: 'subscriber_token_invalid' }));
    }
    await this.prisma.subscriber.delete({ where: { id: subscriber.id } });
    return { message: 'You have been unsubscribed' };
  }

  async listConfirmedForOwner(userId: string, publicationId: string): Promise<object[]> {
    const pub = await this.prisma.publication.findFirst({
      where: { id: publicationId, userId, deletedAt: null },
    });
    if (!pub) throw new ForbiddenException('Forbidden');

    return this.prisma.subscriber.findMany({
      where: { publicationId, confirmed: true },
      select: { id: true, email: true, confirmed: true, confirmedAt: true, tier: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeForOwner(userId: string, publicationId: string, subscriberId: string): Promise<{ deleted: true }> {
    const pub = await this.prisma.publication.findFirst({
      where: { id: publicationId, userId, deletedAt: null },
    });
    if (!pub) throw new ForbiddenException('Forbidden');

    const subscriber = await this.prisma.subscriber.findFirst({ where: { id: subscriberId, publicationId } });
    if (!subscriber) throw new NotFoundException('Subscriber not found');

    await this.prisma.subscriber.delete({ where: { id: subscriberId } });
    return { deleted: true };
  }
}
