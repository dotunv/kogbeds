import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscribersService } from './subscribers.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { PublicationType } from '@prisma/client';

interface RequestWithPublication extends Request {
  publication?: { id: string; type: PublicationType } | null;
}

@ApiTags('subscribers')
@Controller()
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Post('subscribe')
  subscribe(@Req() req: RequestWithPublication, @Body() dto: SubscribeDto) {
    const pub = req.publication;
    if (!pub) {
      throw new NotFoundException('Publication not found');
    }
    return this.subscribersService.subscribe(pub.id, pub.type, dto);
  }

  @Get('subscribe/confirm')
  confirm(@Query('token') token: string) {
    return this.subscribersService.confirmByToken(token);
  }

  @Get('subscribe/unsubscribe')
  unsubscribe(@Query('token') token: string) {
    return this.subscribersService.unsubscribeByToken(token);
  }

  @Get('subscribers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listSubscribers(
    @CurrentUser('id') userId: string,
    @Query('publicationId') publicationId: string,
  ) {
    return this.subscribersService.listConfirmedForOwner(userId, publicationId);
  }

  @Delete('subscribers/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  removeSubscriber(
    @CurrentUser('id') userId: string,
    @Query('publicationId') publicationId: string,
    @Param('id') subscriberId: string,
  ) {
    return this.subscribersService.removeForOwner(userId, publicationId, subscriberId);
  }
}
