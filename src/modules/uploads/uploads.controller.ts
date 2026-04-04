import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { BlogsService } from '../blogs/blogs.service';
import { StorageService } from './storage.service';

const MAX_BYTES = 5 * 1024 * 1024;

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(
    private readonly blogsService: BlogsService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_BYTES },
    }),
  )
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<{ url: string; id: string }> {
    if (!file?.buffer) {
      throw new BadRequestException(
        'file is required (multipart field "file")',
      );
    }

    const blog = await this.blogsService.findByOwnerId(userId);
    if (!blog) {
      throw new BadRequestException('No blog found for current user');
    }

    let mime = file.mimetype;
    if (!mime || mime === 'application/octet-stream') {
      const name = file.originalname.toLowerCase();
      if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
        mime = 'image/jpeg';
      } else if (name.endsWith('.png')) {
        mime = 'image/png';
      } else if (name.endsWith('.webp')) {
        mime = 'image/webp';
      } else if (name.endsWith('.gif')) {
        mime = 'image/gif';
      }
    }

    try {
      this.storage.assertAllowedMime(mime);
    } catch {
      throw new BadRequestException(
        'Only jpeg, png, webp, and gif images are allowed',
      );
    }

    const { Readable } = await import('stream');
    const stream = Readable.from(file.buffer);
    const saved = await this.storage.saveUploadedFile(
      blog.id,
      stream,
      mime,
      file.originalname,
    );

    const asset = await this.prisma.asset.create({
      data: {
        blogId: blog.id,
        filename: saved.filename,
        mimeType: mime,
        sizeBytes: saved.sizeBytes,
      },
    });

    return { id: asset.id, url: saved.relativeUrl };
  }
}
