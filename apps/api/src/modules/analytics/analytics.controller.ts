import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Publication } from '@prisma/client';
import { CurrentPublication } from '../../common/decorators/publication.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { RecordViewDto } from './dto/view.dto';

function requirePublication(publication: Publication | null): Publication {
  if (!publication) {
    throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));
  }
  return publication;
}

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async recordView(@CurrentPublication() publication: Publication | null, @Body() dto: RecordViewDto) {
    await this.analytics.recordView(requirePublication(publication).id, dto.postSlug);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  rollup(
    @CurrentUser('id') userId: string,
    @CurrentPublication() publication: Publication | null,
    @Query('days') days?: string,
  ) {
    return this.analytics.getRollupForOwner(userId, requirePublication(publication).id, days ? parseInt(days, 10) : 30);
  }

  @Get('posts/:slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  postStats(
    @CurrentUser('id') userId: string,
    @CurrentPublication() publication: Publication | null,
    @Param('slug') slug: string,
  ) {
    return this.analytics.getPostStatsForOwner(userId, requirePublication(publication).id, slug);
  }
}
