import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DiscoverService } from './discover.service';

@ApiTags('discover')
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discover: DiscoverService) {}

  @Get()
  list(@Query('tag') tag?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.discover.listRecentPosts({
      tag,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('tags')
  tags() {
    return this.discover.listTags();
  }
}
