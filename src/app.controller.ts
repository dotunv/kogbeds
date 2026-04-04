import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @SkipThrottle()
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe (no dependency checks)' })
  getHealth(): { status: string; service: string } {
    return this.appService.getHealth();
  }

  @SkipThrottle()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe (PostgreSQL connectivity)' })
  getReadiness(): Promise<{
    status: string;
    service: string;
    database: 'up';
  }> {
    return this.appService.getReadiness();
  }
}
