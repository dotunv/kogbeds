import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  getUploadDir(): string {
    const dir = this.config.get<string>('UPLOAD_DIR') ?? join(process.cwd(), 'uploads');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  assertAllowedMime(mime: string): boolean {
    return ALLOWED_MIMES.has(mime);
  }

  extensionForMime(mime: string): string {
    return EXT_BY_MIME[mime] ?? '';
  }

  async saveUploadedFile(
    publicationId: string,
    stream: Readable,
    mimeType: string,
    originalName: string,
  ): Promise<{ filename: string; url: string; sizeBytes: number }> {
    const ext = this.extensionForMime(mimeType) || originalName.match(/\.[a-z0-9]+$/i)?.[0] || '.bin';
    const filename = `${randomUUID()}${ext}`;
    const pubDir = join(this.getUploadDir(), publicationId);
    if (!existsSync(pubDir)) {
      mkdirSync(pubDir, { recursive: true });
    }
    const fullPath = join(pubDir, filename);
    const writeStream = createWriteStream(fullPath);
    await pipeline(stream, writeStream);
    const sizeBytes = statSync(fullPath).size;
    const url = `/files/${publicationId}/${filename}`;
    return { filename, url, sizeBytes };
  }

  deleteFile(publicationId: string, filename: string): void {
    const fullPath = join(this.getUploadDir(), publicationId, filename);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  }
}
