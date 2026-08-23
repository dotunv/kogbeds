import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { Upload } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from './storage.service';

const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(publicationId: string, file: Express.Multer.File | undefined): Promise<Upload> {
    if (!file?.buffer) {
      throw new BadRequestException(JSON.stringify({ code: 'validation_error' }));
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException(JSON.stringify({ code: 'upload_too_large' }));
    }

    let mime = file.mimetype;
    if (!this.storage.assertAllowedMime(mime)) {
      const name = file.originalname.toLowerCase();
      if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mime = 'image/jpeg';
      else if (name.endsWith('.png')) mime = 'image/png';
      else if (name.endsWith('.webp')) mime = 'image/webp';
      else if (name.endsWith('.gif')) mime = 'image/gif';
    }
    if (!this.storage.assertAllowedMime(mime)) {
      throw new BadRequestException(JSON.stringify({ code: 'upload_invalid_type' }));
    }

    const stream = Readable.from(file.buffer);
    const saved = await this.storage.saveUploadedFile(publicationId, stream, mime, file.originalname);

    return this.prisma.upload.create({
      data: {
        publicationId,
        filename: saved.filename,
        originalName: file.originalname,
        mimeType: mime,
        sizeBytes: saved.sizeBytes,
        url: saved.url,
      },
    });
  }

  async listForPublication(publicationId: string): Promise<Upload[]> {
    return this.prisma.upload.findMany({
      where: { publicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeForOwner(userId: string, publicationId: string, uploadId: string): Promise<{ deleted: true }> {
    const pub = await this.prisma.publication.findFirst({ where: { id: publicationId, userId, deletedAt: null } });
    if (!pub) throw new ForbiddenException('Forbidden');

    const upload = await this.prisma.upload.findFirst({ where: { id: uploadId, publicationId } });
    if (!upload) throw new NotFoundException('Upload not found');

    this.storage.deleteFile(publicationId, upload.filename);
    await this.prisma.upload.delete({ where: { id: uploadId } });

    return { deleted: true };
  }
}
