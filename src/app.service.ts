import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth(): { status: string; service: string } {
    return {
      status: 'ok',
      service: 'grizzly',
    };
  }

  async getReadiness(): Promise<{
    status: string;
    service: string;
    database: 'up';
  }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'grizzly',
        database: 'up',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'grizzly',
        database: 'down',
      });
    }
  }
}
