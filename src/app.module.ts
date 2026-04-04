import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validateEnvironment } from './config/environment.validation';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { CommentsModule } from './modules/comments/comments.module';
import { DiscoverModule } from './modules/discover/discover.module';
import { PostsModule } from './modules/posts/posts.module';
import { PublicModule } from './modules/public/public.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          try {
            const u = new URL(redisUrl);
            return {
              connection: {
                host: u.hostname,
                port: Number(u.port || 6379),
                username: u.username || undefined,
                password: u.password || undefined,
              },
            };
          } catch {
            /* fall through */
          }
        }
        return {
          connection: {
            host: config.get<string>('REDIS_HOST') ?? '127.0.0.1',
            port: config.get<number>('REDIS_PORT') ?? 6379,
            password: config.get<string>('REDIS_PASSWORD') || undefined,
          },
        };
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BlogsModule,
    PostsModule,
    UploadsModule,
    PublicModule,
    DiscoverModule,
    CommentsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
