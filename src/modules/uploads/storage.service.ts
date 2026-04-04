import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { randomBytes } from 'crypto';
import type { Readable } from 'stream';

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

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
    const dir =
      this.config.get<string>('UPLOAD_DIR') ??
      join(process.cwd(), 'uploads', 'public');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  assertAllowedMime(mime: string): void {
    if (!ALLOWED_MIMES.has(mime)) {
      throw new Error(`Disallowed file type: ${mime}`);
    }
  }

  extensionForMime(mime: string): string {
    return EXT_BY_MIME[mime] ?? '';
  }

  async saveUploadedFile(
    blogId: string,
    stream: Readable,
    mimeType: string,
    originalName: string,
  ): Promise<{ filename: string; relativeUrl: string; sizeBytes: number }> {
    this.assertAllowedMime(mimeType);
    const ext =
      this.extensionForMime(mimeType) ||
      originalName.match(/\.[a-z0-9]+$/i)?.[0] ||
      '.bin';
    const filename = `${randomBytes(16).toString('hex')}${ext}`;
    const blogDir = join(this.getUploadDir(), blogId);
    if (!existsSync(blogDir)) {
      mkdirSync(blogDir, { recursive: true });
    }
    const fullPath = join(blogDir, filename);
    const writeStream = createWriteStream(fullPath);
    await pipeline(stream, writeStream);
    const sizeBytes = statSync(fullPath).size;
    const relativeUrl = `/uploads/${blogId}/${filename}`;
    return { filename, relativeUrl, sizeBytes };
  }
}
