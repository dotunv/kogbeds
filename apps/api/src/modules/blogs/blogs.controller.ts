import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BlogsService } from './blogs.service';
import { UpdateBlogDto } from './dto/update-blog.dto';

@ApiTags('blogs')
@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMe(@CurrentUser('id') userId: string) {
    return this.blogsService.getForOwner(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  patchMe(@CurrentUser('id') userId: string, @Body() dto: UpdateBlogDto) {
    return this.blogsService.updateForOwner(userId, dto);
  }

  @Post('me/verify-custom-domain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  verifyCustomDomain(@CurrentUser('id') userId: string) {
    return this.blogsService.verifyCustomDomainForOwner(userId);
  }
}
