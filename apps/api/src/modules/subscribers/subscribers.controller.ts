import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Publication } from '@prisma/client';
import { CurrentPublication } from '../../common/decorators/publication.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscribersService } from './subscribers.service';
import { SubscribeDto } from './dto/subscribe.dto';

function requirePublication(publication: Publication | null): Publication {
  if (!publication) {
    throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));
  }
  return publication;
}

@ApiTags('subscribers')
@Controller()
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Post('subscribe')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  subscribe(@CurrentPublication() publication: Publication | null, @Body() dto: SubscribeDto) {
    const pub = requirePublication(publication);
    return this.subscribersService.subscribe(pub.id, pub.type, dto);
  }

  @Get('subscribe/confirm')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  confirm(@Query('token') token: string) {
    return this.subscribersService.confirmByToken(token);
  }

  @Get('subscribe/unsubscribe')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  unsubscribe(@Query('token') token: string) {
    return this.subscribersService.unsubscribeByToken(token);
  }

  @Get('subscribers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listSubscribers(@CurrentUser('id') userId: string, @CurrentPublication() publication: Publication | null) {
    const pub = requirePublication(publication);
    return this.subscribersService.listConfirmedForOwner(userId, pub.id);
  }

  @Delete('subscribers/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  removeSubscriber(
    @CurrentUser('id') userId: string,
    @CurrentPublication() publication: Publication | null,
    @Param('id') subscriberId: string,
  ) {
    const pub = requirePublication(publication);
    return this.subscribersService.removeForOwner(userId, pub.id, subscriberId);
  }
}
