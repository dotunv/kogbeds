import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { validateEnvironment } from './config/environment.validation';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommentsModule } from './modules/comments/comments.module';
import { DiscoverModule } from './modules/discover/discover.module';
import { EbooksModule } from './modules/ebooks/ebooks.module';
import { FeedsModule } from './modules/feeds/feeds.module';
import { MailModule } from './modules/mail/mail.module';
import { PostsModule } from './modules/posts/posts.module';
import { PublicationsModule } from './modules/publications/publications.module';
import { QueueModule } from './modules/queue/queue.module';
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
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    QueueModule,
    MailModule,
    AuthModule,
    PublicationsModule,
    PostsModule,
    CommentsModule,
    SubscribersModule,
    UploadsModule,
    AnalyticsModule,
    DiscoverModule,
    EbooksModule,
    FeedsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
