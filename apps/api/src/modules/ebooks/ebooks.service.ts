import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Ebook, EbookChapter, PostFormat, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEbookDto } from './dto/create-ebook.dto';
import { UpdateEbookDto } from './dto/update-ebook.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { ReorderChaptersDto } from './dto/reorder-chapters.dto';

const MAX_EBOOKS = 20;
const MAX_BLOCKS = 500;

@Injectable()
export class EbooksService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<Ebook[]> {
    return this.prisma.ebook.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createForUser(userId: string, dto: CreateEbookDto): Promise<Ebook> {
    const count = await this.prisma.ebook.count({
      where: { userId, deletedAt: null },
    });
    if (count >= MAX_EBOOKS) {
      throw new ForbiddenException(JSON.stringify({ code: 'ebook_limit_reached' }));
    }
    return this.prisma.ebook.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description ?? '',
      },
    });
  }

  async getForOwner(userId: string, ebookId: string): Promise<Ebook & { chapters: EbookChapter[] }> {
    const ebook = await this.prisma.ebook.findFirst({
      where: { id: ebookId, userId, deletedAt: null },
      include: { chapters: { orderBy: { order: 'asc' } } },
    });
    if (!ebook) throw new NotFoundException(JSON.stringify({ code: 'ebook_not_found' }));
    return ebook;
  }

  async updateForOwner(userId: string, ebookId: string, dto: UpdateEbookDto): Promise<Ebook> {
    const ebook = await this.requireOwner(userId, ebookId);
    return this.prisma.ebook.update({
      where: { id: ebook.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
  }

  async softDeleteForOwner(userId: string, ebookId: string): Promise<{ deleted: true }> {
    const ebook = await this.requireOwner(userId, ebookId);
    await this.prisma.ebook.update({
      where: { id: ebook.id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async publishForOwner(userId: string, ebookId: string): Promise<Ebook> {
    const ebook = await this.requireOwner(userId, ebookId);
    return this.prisma.ebook.update({
      where: { id: ebook.id },
      data: { status: 'PUBLISHED' },
    });
  }

  async unpublishForOwner(userId: string, ebookId: string): Promise<Ebook> {
    const ebook = await this.requireOwner(userId, ebookId);
    return this.prisma.ebook.update({
      where: { id: ebook.id },
      data: { status: 'DRAFT' },
    });
  }

  // ── Chapters ──────────────────────────────────────────────────────────────

  async listChapters(userId: string, ebookId: string): Promise<EbookChapter[]> {
    await this.requireOwner(userId, ebookId);
    return this.prisma.ebookChapter.findMany({
      where: { ebookId },
      orderBy: { order: 'asc' },
    });
  }

  async addChapter(userId: string, ebookId: string, dto: CreateChapterDto): Promise<EbookChapter> {
    await this.requireOwner(userId, ebookId);
    this.validateChapterContent(dto);

    const last = await this.prisma.ebookChapter.findFirst({
      where: { ebookId },
      orderBy: { order: 'desc' },
    });
    const nextOrder = (last?.order ?? 0) + 1;

    return this.prisma.ebookChapter.create({
      data: {
        ebookId,
        title: dto.title,
        order: nextOrder,
        format: dto.format,
        markdownContent: dto.format === PostFormat.MARKDOWN ? dto.markdownContent ?? null : null,
        blocks: dto.format === PostFormat.BLOCKS ? (dto.blocks as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  }

  async getChapter(userId: string, ebookId: string, order: number): Promise<EbookChapter> {
    await this.requireOwner(userId, ebookId);
    const chapter = await this.prisma.ebookChapter.findUnique({
      where: { ebookId_order: { ebookId, order } },
    });
    if (!chapter) throw new NotFoundException(JSON.stringify({ code: 'ebook_chapter_not_found' }));
    return chapter;
  }

  async updateChapter(
    userId: string,
    ebookId: string,
    order: number,
    dto: CreateChapterDto,
  ): Promise<EbookChapter> {
    const chapter = await this.getChapter(userId, ebookId, order);
    this.validateChapterContent(dto);

    return this.prisma.ebookChapter.update({
      where: { id: chapter.id },
      data: {
        title: dto.title,
        format: dto.format,
        markdownContent: dto.format === PostFormat.MARKDOWN ? dto.markdownContent ?? null : null,
        blocks: dto.format === PostFormat.BLOCKS ? (dto.blocks as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  }

  async deleteChapter(userId: string, ebookId: string, order: number): Promise<{ deleted: true }> {
    const chapter = await this.getChapter(userId, ebookId, order);

    await this.prisma.$transaction(async (tx) => {
      await tx.ebookChapter.delete({ where: { id: chapter.id } });
      // Resequence subsequent chapters
      const subsequent = await tx.ebookChapter.findMany({
        where: { ebookId, order: { gt: order } },
        orderBy: { order: 'asc' },
      });
      for (const ch of subsequent) {
        await tx.ebookChapter.update({
          where: { id: ch.id },
          data: { order: ch.order - 1 },
        });
      }
    });

    return { deleted: true };
  }

  async reorderChapters(
    userId: string,
    ebookId: string,
    dto: ReorderChaptersDto,
  ): Promise<EbookChapter[]> {
    await this.requireOwner(userId, ebookId);

    const existing = await this.prisma.ebookChapter.findMany({
      where: { ebookId },
      orderBy: { order: 'asc' },
    });

    const existingOrders = existing.map((c) => c.order).sort((a, b) => a - b);
    const incomingOrders = [...dto.order].sort((a, b) => a - b);

    if (
      existingOrders.length !== incomingOrders.length ||
      !existingOrders.every((o, i) => o === incomingOrders[i])
    ) {
      throw new BadRequestException(
        JSON.stringify({ code: 'ebook_chapter_order_conflict' }),
      );
    }

    // dto.order[i] = current order of chapter that should go to position i+1
    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < dto.order.length; i++) {
        const currentOrder = dto.order[i];
        const newOrder = i + 1;
        const chapter = existing.find((c) => c.order === currentOrder);
        if (chapter && chapter.order !== newOrder) {
          // Use temp negative values to avoid unique constraint conflicts
          await tx.ebookChapter.update({
            where: { id: chapter.id },
            data: { order: -(newOrder) },
          });
        }
      }
      // Fix negative values
      for (let i = 0; i < dto.order.length; i++) {
        const newOrder = i + 1;
        const currentOrder = dto.order[i];
        const chapter = existing.find((c) => c.order === currentOrder);
        if (chapter) {
          await tx.ebookChapter.update({
            where: { id: chapter.id },
            data: { order: newOrder },
          });
        }
      }
    });

    return this.prisma.ebookChapter.findMany({
      where: { ebookId },
      orderBy: { order: 'asc' },
    });
  }

  private validateChapterContent(dto: CreateChapterDto): void {
    if (dto.format === PostFormat.MARKDOWN && !dto.markdownContent) {
      throw new BadRequestException('markdownContent is required for MARKDOWN format');
    }
    if (dto.format === PostFormat.BLOCKS) {
      if (!dto.blocks || !Array.isArray(dto.blocks)) {
        throw new BadRequestException('blocks is required for BLOCKS format');
      }
      if ((dto.blocks as unknown[]).length > MAX_BLOCKS) {
        throw new BadRequestException('Max 500 blocks per chapter');
      }
    }
  }

  private async requireOwner(userId: string, ebookId: string): Promise<Ebook> {
    const ebook = await this.prisma.ebook.findFirst({
      where: { id: ebookId, userId, deletedAt: null },
    });
    if (!ebook) throw new NotFoundException(JSON.stringify({ code: 'ebook_not_found' }));
    return ebook;
  }
}
