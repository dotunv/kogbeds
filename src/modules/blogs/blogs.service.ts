import { Injectable } from '@nestjs/common';
import { Blog } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
}
