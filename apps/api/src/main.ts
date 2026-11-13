import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(cookieParser());
  app.use(helmet());

  const configService = app.get(ConfigService);

  const uploadDir = configService.get<string>('UPLOAD_DIR') ?? join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, {
    prefix: '/files/',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'private, max-age=3600');
    },
  });

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    });
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Grizzly API')
    .setDescription('Privacy-first, multi-tenant publishing platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  if (process.env.NODE_ENV === 'production' && process.env.SWAGGER_USER && process.env.SWAGGER_PASS) {
    app.use('/api-docs*', (req: Request, res: Response, next: NextFunction) => {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic');
        res.status(401).send('Authentication required');
        return;
      }
      const credentials = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
      const [user, pass] = credentials.split(':');
      if (user === process.env.SWAGGER_USER && pass === process.env.SWAGGER_PASS) {
        return next();
      }
      res.status(401).send('Invalid credentials');
    });
  }
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}
void bootstrap();
