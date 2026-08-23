import { Injectable, NestMiddleware, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../types/tenant.types';

export type TenantRequest = Request & { tenant?: TenantContext };

const SKIP_PREFIXES = ['/auth', '/api-docs', '/health'];
const CACHE_TTL_SECONDS = 60;

@Injectable()
export class TenantMiddleware implements NestMiddleware, OnModuleDestroy {
  private readonly redis: Redis;
  private readonly rootDomain: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.rootDomain = (this.config.get<string>('ROOT_DOMAIN') ?? 'localhost').toLowerCase();
    const redisUrl = this.config.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379';
    this.redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    this.redis.on('error', () => {
      // swallow — tenant caching is best-effort
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      // ignore
    }
  }

  async use(req: TenantRequest, _res: Response, next: NextFunction): Promise<void> {
    const path = req.path ?? req.url.split('?')[0] ?? '';
    if (SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return next();
    }

    const hostHeader = req.hostname || (req.headers.host ?? '');
    const hostname = hostHeader.split(':')[0]?.toLowerCase() ?? '';

    try {
      const cached = await this.getCached(hostname);
      if (cached !== undefined) {
        req.tenant = cached;
        return next();
      }
    } catch {
      // cache miss / redis unavailable — fall through to DB resolution
    }

    const tenant = await this.resolveTenant(hostname);
    req.tenant = tenant;

    try {
      await this.setCached(hostname, tenant);
    } catch {
      // best-effort caching only
    }

    next();
  }

  private async resolveTenant(hostname: string): Promise<TenantContext> {
    if (hostname === this.rootDomain || hostname === `www.${this.rootDomain}`) {
      return { type: 'root', publication: null };
    }

    if (hostname.endsWith(`.${this.rootDomain}`)) {
      const subdomain = hostname.slice(0, -(this.rootDomain.length + 1));
      if (subdomain && !subdomain.includes('.')) {
        const publication = await this.prisma.publication.findFirst({
          where: { slug: subdomain, deletedAt: null },
        });
        return { type: 'subdomain', publication: publication ?? null };
      }
      return { type: 'subdomain', publication: null };
    }

    const publication = await this.prisma.publication.findFirst({
      where: { customDomain: hostname, domainVerified: true, deletedAt: null },
    });
    return { type: 'custom_domain', publication: publication ?? null };
  }

  private cacheKey(hostname: string): string {
    return `tenant:${hostname}`;
  }

  private async getCached(hostname: string): Promise<TenantContext | undefined> {
    const raw = await this.redis.get(this.cacheKey(hostname));
    if (raw === null) return undefined;
    return JSON.parse(raw) as TenantContext;
  }

  private async setCached(hostname: string, tenant: TenantContext): Promise<void> {
    await this.redis.set(
      this.cacheKey(hostname),
      JSON.stringify(tenant),
      'EX',
      CACHE_TTL_SECONDS,
    );
  }

  static async bustCache(config: ConfigService, hostnames: string[]): Promise<void> {
    const redisUrl = config.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379';
    const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    try {
      await redis.connect();
      if (hostnames.length > 0) {
        await redis.del(...hostnames.map((h) => `tenant:${h.toLowerCase()}`));
      }
    } catch {
      // best-effort
    } finally {
      try {
        await redis.quit();
      } catch {
        // ignore
      }
    }
  }
}
