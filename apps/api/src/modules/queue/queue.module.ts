import { Global, Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PostsModule } from '../posts/posts.module';
import { GRIZZLY_QUEUE } from './queue.constants';
import { QueueProcessor } from './queue.processor';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379';
        try {
          const u = new URL(redisUrl);
          return {
            connection: {
              host: u.hostname,
              port: Number(u.port || 6379),
              username: u.username || undefined,
              password: u.password || undefined,
              tls: u.protocol === 'rediss:' ? {} : undefined,
            },
          };
        } catch {
          return { connection: { host: '127.0.0.1', port: 6379 } };
        }
      },
    }),
    BullModule.registerQueue({ name: GRIZZLY_QUEUE }),
    forwardRef(() => PostsModule),
  ],
  providers: [QueueProcessor, QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
