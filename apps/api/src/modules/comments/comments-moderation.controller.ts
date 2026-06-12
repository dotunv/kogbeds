import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommentModerationStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';
import {
  ModerateCommentAction,
  ModerateCommentDto,
} from './dto/moderate-comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsModerationController {
  constructor(private readonly comments: CommentsService) {}

  @Get('pending')
  listPending(
    @CurrentUser('id') userId: string,
    @Query('blogId') blogId: string,
  ) {
    if (!blogId) {
      throw new BadRequestException('blogId query is required');
    }
    return this.comments.listPendingForOwner(userId, blogId);
  }

  @Patch(':id/moderation')
  moderate(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ModerateCommentDto,
  ) {
    const statusMap: Record<ModerateCommentAction, CommentModerationStatus> = {
      [ModerateCommentAction.APPROVED]: CommentModerationStatus.APPROVED,
      [ModerateCommentAction.SPAM]: CommentModerationStatus.SPAM,
      [ModerateCommentAction.REJECTED]: CommentModerationStatus.REJECTED,
    };
    return this.comments.moderateForOwner(userId, id, statusMap[dto.status]);
  }
}
