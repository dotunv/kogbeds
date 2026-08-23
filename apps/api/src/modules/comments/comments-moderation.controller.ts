import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { ModerateCommentDto } from './dto/moderate-comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsModerationController {
  constructor(private readonly comments: CommentsService) {}

  @Get('pending')
  listPending(@CurrentUser('id') userId: string) {
    return this.comments.listPendingForOwner(userId);
  }

  @Patch(':id')
  moderate(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ModerateCommentDto,
  ) {
    return this.comments.moderateForOwner(userId, id, dto.status);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.comments.removeForOwner(userId, id);
  }
}
