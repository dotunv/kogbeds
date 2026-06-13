import { PublicationType } from '@prisma/client';

export type PostPublishedPayload = {
  publicationId: string;
  postId: string;
  title: string;
  slug: string;
  excerpt: string;
  publicationType: PublicationType;
};

export const POST_PUBLISHED_EVENT = 'post.published' as const;
