import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DEFAULT_JOB_OPTS, GRIZZLY_QUEUE, JobName } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(@InjectQueue(GRIZZLY_QUEUE) private readonly queue: Queue) {}

  async enqueue(
    name: JobName,
    data: Record<string, unknown>,
    opts?: { delay?: number },
  ): Promise<void> {
    await this.queue.add(name, data, { ...DEFAULT_JOB_OPTS, ...opts });
  }
}
