import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EbooksService } from './ebooks.service';
import { CreateEbookDto } from './dto/create-ebook.dto';
import { UpdateEbookDto } from './dto/update-ebook.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { ReorderChaptersDto } from './dto/reorder-chapters.dto';

@ApiTags('ebooks')
@ApiBearerAuth()
@Controller('ebooks')
@UseGuards(JwtAuthGuard)
export class EbooksController {
  constructor(private readonly ebooksService: EbooksService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.ebooksService.listForUser(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateEbookDto) {
    return this.ebooksService.createForUser(userId, dto);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ebooksService.getForOwner(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEbookDto,
  ) {
    return this.ebooksService.updateForOwner(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ebooksService.softDeleteForOwner(userId, id);
  }

  @Post(':id/publish')
  publish(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ebooksService.publishForOwner(userId, id);
  }

  @Post(':id/unpublish')
  unpublish(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ebooksService.unpublishForOwner(userId, id);
  }

  // ── Chapters ──────────────────────────────────────────────────────────────

  @Get(':id/chapters')
  listChapters(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ebooksService.listChapters(userId, id);
  }

  @Post(':id/chapters')
  addChapter(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateChapterDto,
  ) {
    return this.ebooksService.addChapter(userId, id, dto);
  }

  @Post(':id/chapters/reorder')
  reorderChapters(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ReorderChaptersDto,
  ) {
    return this.ebooksService.reorderChapters(userId, id, dto);
  }

  @Get(':id/chapters/:order')
  getChapter(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('order', ParseIntPipe) order: number,
  ) {
    return this.ebooksService.getChapter(userId, id, order);
  }

  @Patch(':id/chapters/:order')
  updateChapter(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('order', ParseIntPipe) order: number,
    @Body() dto: CreateChapterDto,
  ) {
    return this.ebooksService.updateChapter(userId, id, order, dto);
  }

  @Delete(':id/chapters/:order')
  deleteChapter(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('order', ParseIntPipe) order: number,
  ) {
    return this.ebooksService.deleteChapter(userId, id, order);
  }
}
