import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Blog, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BlogsService } from '../blogs/blogs.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthTokenPayload } from './interfaces/auth-token-payload.interface';

type SafeUser = Omit<User, 'passwordHash'>;

export type AuthResponse = {
  accessToken: string;
  user: SafeUser;
  blog: Blog | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly blogsService: BlogsService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();

    const [existingEmailUser, existingUsernameUser] = await Promise.all([
      this.usersService.findByEmail(email),
      this.usersService.findByUsername(username),
    ]);

    if (existingEmailUser) {
      throw new ConflictException('Email is already registered');
    }
    if (existingUsernameUser) {
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const userWithBlog = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          username,
          passwordHash,
        },
      });

      const blog = await tx.blog.create({
        data: {
          ownerId: user.id,
          title: `${username}'s blog`,
          description: `Welcome to ${username}'s Grizzly blog.`,
        },
      });

      return { user, blog };
    });

    const safeUser = this.stripSensitiveFields(userWithBlog.user);
    const accessToken = await this.signToken(userWithBlog.user);

    return {
      accessToken,
      user: safeUser,
      blog: userWithBlog.blog,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const blog = await this.blogsService.findByOwnerId(user.id);
    if (!blog) {
      throw new InternalServerErrorException(
        'Blog was not found for this user account',
      );
    }
    const accessToken = await this.signToken(user);

    return {
      accessToken,
      user: this.stripSensitiveFields(user),
      blog,
    };
  }

  async getProfile(
    userId: string,
  ): Promise<{ user: SafeUser; blog: Blog | null }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const blog = await this.blogsService.findByOwnerId(user.id);
    if (!blog) {
      throw new InternalServerErrorException(
        'Blog was not found for this user account',
      );
    }

    return {
      user: this.stripSensitiveFields(user),
      blog,
    };
  }

  private async signToken(user: User): Promise<string> {
    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    return this.jwtService.signAsync(payload);
  }

  private stripSensitiveFields(user: User): SafeUser {
    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    return safeUser;
  }
}
