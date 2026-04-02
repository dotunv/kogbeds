import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicService } from './modules/public/public.service';
import { PublicRequestContext } from './modules/public/public-request-context.interface';
import { Request, Response, NextFunction } from 'express';

type PublicRequest = Request & {
  publicContext?: PublicRequestContext;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  app.use(async (req: Request, _res: Response, next: NextFunction) => {
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
    };

    if (!isRootHost && hostname.endsWith(`.${appDomain}`)) {
      const username = hostname.slice(0, -(appDomain.length + 1)).trim();
      if (username && !username.includes('.')) {
        const blog = await publicService.getBlogByUsername(username);
        if (blog) {
          request.publicContext = {
            hostname,
            scheme,
            isRootHost,
            blogUsername: username,
            blog: {
              id: blog.id,
              title: blog.title,
              description: blog.description,
              customCss: blog.customCss,
              username: blog.username,
            },
          };
        }

        // Route subdomain public traffic to the public controller namespace.
        if (!req.url.startsWith('/public')) {
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
