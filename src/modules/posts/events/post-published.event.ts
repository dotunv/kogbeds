export type PostPublishedPayload = {
  blogId: string;
  postId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  blogUsername: string;
  siteBaseUrl: string;
};

export const POST_PUBLISHED_EVENT = 'post.published' as const;
