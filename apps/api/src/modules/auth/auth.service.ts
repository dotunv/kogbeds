import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { StringValue } from 'ms';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicationsService } from '../publications/publications.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthTokenPayload, RefreshTokenPayload } from './interfaces/auth-token-payload.interface';

type SafeUser = Omit<User, 'passwordHash'>;

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; username: string };
};

const BCRYPT_COST = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicationsService: PublicationsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();

    const [existingEmail, existingUsername] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.user.findUnique({ where: { username } }),
    ]);

    if (existingEmail) {
      throw new ConflictException(JSON.stringify({ code: 'auth_email_taken' }));
    }
    if (existingUsername) {
      throw new ConflictException(JSON.stringify({ code: 'auth_username_taken' }));
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, username, passwordHash },
      });
      await this.publicationsService.createDefault(created.id, username, tx);
      return created;
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException(JSON.stringify({ code: 'auth_invalid_credentials' }));
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(JSON.stringify({ code: 'auth_invalid_credentials' }));
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string | undefined): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException(JSON.stringify({ code: 'auth_token_expired' }));
    }

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(JSON.stringify({ code: 'auth_token_expired' }));
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException(JSON.stringify({ code: 'auth_token_expired' }));
    }

    return { accessToken: await this.signAccessToken(user) };
  }

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await this.requireUser(userId);
    return this.stripSensitiveFields(user);
  }

  async updateProfile(userId: string, dto: UpdateMeDto): Promise<SafeUser> {
    const user = await this.requireUser(userId);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException(JSON.stringify({ code: 'auth_email_taken' }));
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.email !== undefined ? { email: dto.email } : {}),
      },
    });

    return this.stripSensitiveFields(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.requireUser(userId);

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException(JSON.stringify({ code: 'auth_invalid_credentials' }));
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_COST);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: 'Password updated' };
  }

  refreshCookieOptions(): { httpOnly: true; secure: boolean; sameSite: 'lax'; maxAge: number; path: string } {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth',
    };
  }

  private async issueTokens(user: User): Promise<AuthResponse> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.signRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, username: user.username },
    };
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: AuthTokenPayload = { sub: user.id, email: user.email };
    return this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ?? '15m') as StringValue,
    });
  }

  private async signRefreshToken(user: User): Promise<string> {
    const payload: RefreshTokenPayload = { sub: user.id };
    return this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('REFRESH_SECRET'),
      expiresIn: (this.config.get<string>('REFRESH_EXPIRES_IN') ?? '7d') as StringValue,
    });
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(JSON.stringify({ code: 'validation_error' }));
    }
    return user;
  }

  private stripSensitiveFields(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
