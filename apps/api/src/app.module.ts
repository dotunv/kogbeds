import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
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
import { CommentsModule } from './modules/comments/comments.module';
import { DiscoverModule } from './modules/discover/discover.module';
import { EbooksModule } from './modules/ebooks/ebooks.module';
import { PostsModule } from './modules/posts/posts.module';
import { PublicModule } from './modules/public/public.module';
import { PublicationsModule } from './modules/publications/publications.module';
import { SubscribersModule } from './modules/subscribers/subscribers.module';
import { UploadsModule } from './modules/uploads/uploads.module';
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
            const useTls =
              u.protocol === 'rediss:' ||
              config.get<string>('REDIS_TLS') === 'true';
            return {
              connection: {
                host: u.hostname,
                port: Number(u.port || (useTls ? 6380 : 6379)),
                username: u.username || undefined,
                password: u.password || undefined,
                tls: useTls ? {} : undefined,
              },
            };
          } catch {
            /* fall through */
          }
        }
        const useTls = config.get<string>('REDIS_TLS') === 'true';
        return {
          connection: {
            host: config.get<string>('REDIS_HOST') ?? '127.0.0.1',
            port: config.get<number>('REDIS_PORT') ?? (useTls ? 6380 : 6379),
            password: config.get<string>('REDIS_PASSWORD') || undefined,
            tls: useTls ? {} : undefined,
          },
        };
      },
    }),
    PrismaModule,
    AuthModule,
    PublicationsModule,
    PostsModule,
    UploadsModule,
    PublicModule,
    DiscoverModule,
    CommentsModule,
    AnalyticsModule,
    SubscribersModule,
    EbooksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
