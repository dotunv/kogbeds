import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Blog, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class BlogsService {
  constructor(private readonly prisma: PrismaService) {}

  createDefaultForUser(userId: string, username: string): Promise<Blog> {
    return this.prisma.blog.create({
      data: {
        ownerId: userId,
        title: `${username}'s Blog`,
        description: 'A minimalist Grizzly blog.',
      },
    });
  }

  findByOwnerId(ownerId: string): Promise<Blog | null> {
    return this.prisma.blog.findUnique({
      where: { ownerId },
    });
  }

  async getForOwner(userId: string): Promise<Blog> {
    const blog = await this.findByOwnerId(userId);
    if (!blog) {
      throw new NotFoundException('No blog found for current user');
    }
    return blog;
  }

  async updateForOwner(userId: string, dto: UpdateBlogDto): Promise<Blog> {
    const existing = await this.getForOwner(userId);

    let customDomain = existing.customDomain;
    let customDomainVerifyToken = existing.customDomainVerifyToken;
    let customDomainVerifiedAt = existing.customDomainVerifiedAt;

    if (dto.customDomain !== undefined) {
      const next =
        dto.customDomain === null || dto.customDomain === ''
          ? null
          : dto.customDomain.trim().toLowerCase();
      if (next === null) {
        customDomain = null;
        customDomainVerifyToken = null;
        customDomainVerifiedAt = null;
      } else {
        if (next !== existing.customDomain?.toLowerCase()) {
          const taken = await this.prisma.blog.findFirst({
            where: {
              customDomain: next,
              NOT: { id: existing.id },
            },
          });
          if (taken) {
            throw new ConflictException('This custom domain is already in use');
          }
          customDomain = next;
          customDomainVerifyToken = randomBytes(24).toString('hex');
          customDomainVerifiedAt = null;
        }
      }
    }

    try {
      return await this.prisma.blog.update({
        where: { id: existing.id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() || null }
            : {}),
          ...(dto.customCss !== undefined
            ? { customCss: dto.customCss.trim() || null }
            : {}),
          ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
          ...(dto.customDomain !== undefined
            ? {
                customDomain,
                customDomainVerifyToken,
                customDomainVerifiedAt,
              }
            : {}),
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('This custom domain is already in use');
      }
      throw error;
    }
  }

  async verifyCustomDomainForOwner(userId: string): Promise<Blog> {
    const blog = await this.getForOwner(userId);
    if (!blog.customDomain || !blog.customDomainVerifyToken) {
      throw new ForbiddenException('No pending custom domain to verify');
    }
    if (blog.customDomainVerifiedAt) {
      return blog;
    }
    return this.prisma.blog.update({
      where: { id: blog.id },
      data: { customDomainVerifiedAt: new Date() },
    });
  }
}
