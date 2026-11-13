import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicationPostsController } from './publication-posts.controller';
import { PostsService } from './posts.service';

describe('PublicationPostsController', () => {
  it('does not expose another writer’s publication to dashboard requests', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const posts = { getBySlug: jest.fn() };
    const controller = new PublicationPostsController(
      { publication: { findFirst } } as unknown as PrismaService,
      posts as unknown as PostsService,
    );
    await expect(controller.delete('someone-else', 'draft', 'writer')).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith({ where: { slug: 'someone-else', userId: 'writer', deletedAt: null } });
    expect(posts.getBySlug).not.toHaveBeenCalled();
  });
});
