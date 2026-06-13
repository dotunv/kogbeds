import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PublicationsService } from './publications.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { InitiateDomainDto } from './dto/initiate-domain.dto';

@ApiTags('publications')
@Controller('publications')
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  list(@CurrentUser('id') userId: string) {
    return this.publicationsService.listForUser(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePublicationDto) {
    return this.publicationsService.createForUser(userId, dto);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string, @CurrentUser('id') userId?: string) {
    return this.publicationsService.getBySlugPublic(slug, userId);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() dto: UpdatePublicationDto,
  ) {
    return this.publicationsService.updateForOwner(userId, slug, dto);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@CurrentUser('id') userId: string, @Param('slug') slug: string) {
    return this.publicationsService.softDeleteForOwner(userId, slug);
  }

  @Post(':slug/domain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  initiateDomain(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() dto: InitiateDomainDto,
  ) {
    return this.publicationsService.initiateDomain(userId, slug, dto);
  }

  @Post(':slug/domain/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  verifyDomain(@CurrentUser('id') userId: string, @Param('slug') slug: string) {
    return this.publicationsService.verifyDomain(userId, slug);
  }

  @Delete(':slug/domain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  removeDomain(@CurrentUser('id') userId: string, @Param('slug') slug: string) {
    return this.publicationsService.removeDomain(userId, slug);
  }
}
