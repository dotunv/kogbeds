import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { Publication } from '@prisma/client';
import { CurrentPublication } from '../../common/decorators/publication.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

const MAX_BYTES = 5 * 1024 * 1024;

function requirePublication(publication: Publication | null): Publication {
  if (!publication) {
    throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));
  }
  return publication;
}

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_BYTES },
    }),
  )
  upload(
    @CurrentPublication() publication: Publication | null,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.uploadsService.upload(requirePublication(publication).id, file);
  }

  @Get()
  list(@CurrentPublication() publication: Publication | null) {
    return this.uploadsService.listForPublication(requirePublication(publication).id);
  }

  @Delete(':id')
  remove(
    @CurrentUser('id') userId: string,
    @CurrentPublication() publication: Publication | null,
    @Param('id') id: string,
  ) {
    return this.uploadsService.removeForOwner(userId, requirePublication(publication).id, id);
  }
}
