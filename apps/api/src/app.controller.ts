import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService, HealthStatus } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @SkipThrottle()
  @Get('health')
  @ApiOperation({ summary: 'Health check — DB and Redis connectivity' })
  getHealth(): Promise<HealthStatus> {
    return this.appService.getHealth();
  }
}
