import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { PublicService } from './modules/public/public.service';
import { PublicRequestContext } from './modules/public/public-request-context.interface';

type PublicRequest = Request & {
  publicContext?: PublicRequestContext;
};

const isApiPath = (url: string): boolean => {
  const p = url.split('?')[0] ?? url;
  return (
    p.startsWith('/auth') ||
    p.startsWith('/users') ||
    p.startsWith('/blogs') ||
    p.startsWith('/posts') ||
    p.startsWith('/comments') ||
    p.startsWith('/analytics') ||
    p.startsWith('/uploads') ||
    p.startsWith('/health') ||
    p.startsWith('/api-docs')
  );
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService);
  const publicService = app.get(PublicService);
  const appDomain = (
    configService.get<string>('APP_DOMAIN') ?? 'localhost'
  ).toLowerCase();

  const uploadDir =
    configService.get<string>('UPLOAD_DIR') ??
    join(process.cwd(), 'uploads', 'public');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    });
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Grizzly API')
    .setDescription('Bear-style multi-tenant blogging platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    if (isApiPath(req.url)) {
      return next();
    }

    const request = req as PublicRequest;
    const forwardedProtoHeader = req.headers['x-forwarded-proto'];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader;
    const scheme: 'http' | 'https' =
      forwardedProto === 'https' ? 'https' : 'http';
    const hostHeader = req.headers.host ?? '';
    const hostname = hostHeader.split(':')[0]?.toLowerCase() ?? '';
    const isRootHost =
      hostname === appDomain || hostname === `www.${appDomain}`;

    request.publicContext = {
      hostname,
      scheme,
      isRootHost,
      blogUsername: null,
      blog: null,
      domainChallengeToken: null,
    };

    if (isRootHost) {
      if (!req.url.startsWith('/discover')) {
        if (req.url === '/' || req.url === '') {
          request.url = '/discover';
        } else if (req.url === '/feed.xml') {
          request.url = '/discover/feed.xml';
        } else if (
          req.url === '/sitemap.xml' ||
          req.url.startsWith('/sitemap.xml?')
        ) {
          request.url = '/discover/sitemap.xml';
        } else if (req.url === '/robots.txt') {
          request.url = '/discover/robots.txt';
        }
      }
      return next();
    }

    const custom = await publicService.getBlogByCustomDomain(hostname);
    if (custom) {
      request.publicContext = {
        hostname,
        scheme,
        isRootHost: false,
        blogUsername: custom.blog.username,
        blog: {
          id: custom.blog.id,
          title: custom.blog.title,
          description: custom.blog.description,
          customCss: custom.blog.customCss,
          username: custom.blog.username,
        },
        domainChallengeToken: custom.domainChallengeToken,
      };

      if (req.url.startsWith('/.well-known/grizzly-domain.txt')) {
        request.url = '/public/domain-challenge';
      } else if (
        req.url === '/sitemap.xml' ||
        req.url.startsWith('/sitemap.xml?')
      ) {
        request.url = '/public/sitemap.xml';
      } else if (!req.url.startsWith('/public')) {
        request.url =
          req.url === '/' || req.url === '' ? '/public' : `/public${req.url}`;
      }
      return next();
    }

    if (hostname.endsWith(`.${appDomain}`)) {
      const username = hostname.slice(0, -(appDomain.length + 1)).trim();
      if (username && !username.includes('.')) {
        const blog = await publicService.getBlogByUsername(username);
        if (blog) {
          request.publicContext = {
            hostname,
            scheme,
            isRootHost: false,
            blogUsername: username,
            blog: {
              id: blog.id,
              title: blog.title,
              description: blog.description,
              customCss: blog.customCss,
              username: blog.username,
            },
            domainChallengeToken: null,
          };
        }

        if (req.url.startsWith('/.well-known/grizzly-domain.txt')) {
          request.url = '/public/domain-challenge';
        } else if (
          req.url === '/sitemap.xml' ||
          req.url.startsWith('/sitemap.xml?')
        ) {
          request.url = '/public/sitemap.xml';
        } else if (!req.url.startsWith('/public')) {
          request.url =
            req.url === '/' || req.url === '' ? '/public' : `/public${req.url}`;
        }
      }
    }

    next();
  });

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}
void bootstrap();
