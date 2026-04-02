import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser('id') userId: string): Promise<{
    id: string;
    email: string;
    username: string;
    createdAt: Date;
  }> {
    const fullUser = await this.usersService.findById(userId);

    if (!fullUser) {
      // Guard guarantees token is valid, so this is a rare edge case.
      throw new NotFoundException('User not found');
    }

    return {
      id: fullUser.id,
      email: fullUser.email,
      username: fullUser.username,
      createdAt: fullUser.createdAt,
    };
  }
}
