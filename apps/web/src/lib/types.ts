export type Blog = {
  id: string;
  slug: string;
  title: string;
  description: string;
  accentColor: string;
  coverImageUrl: string | null;
  faviconUrl: string | null;
  footerText: string;
  customDomain: string | null;
  domainVerified: boolean;
  isPublic: boolean;
  createdAt: string;
};

export type Post = {
  id: string;
  blogId: string;
  title: string;
  slug: string;
  excerpt: string;
  format: 'MARKDOWN' | 'BLOCKS';
  markdownContent?: string | null;
  blocks?: Block[] | null;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  publishedAt: string | null;
  scheduledAt: string | null;
  isPaywalled: boolean;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number };
  viewCount?: number;
};

export type Tag = {
  id: string;
  name: string;
};

export type Block =
  | { type: 'PARAGRAPH'; content: string }
  | { type: 'HEADING_1'; content: string }
  | { type: 'HEADING_2'; content: string }
  | { type: 'HEADING_3'; content: string }
  | { type: 'BLOCKQUOTE'; content: string }
  | { type: 'CODE'; content: string; language?: string }
  | { type: 'ORDERED_LIST'; items: string[] }
  | { type: 'UNORDERED_LIST'; items: string[] }
  | { type: 'IMAGE'; url: string; alt?: string; caption?: string }
  | { type: 'YOUTUBE_EMBED'; videoId: string }
  | { type: 'DIVIDER' };

export type Comment = {
  id: string;
  postId: string;
  authorName: string | null;
  body: string;
  status: 'PENDING' | 'APPROVED' | 'SPAM' | 'REJECTED';
  createdAt: string;
};

export type Subscriber = {
  id: string;
  blogId: string;
  email: string;
  confirmed: boolean;
  confirmedAt: string | null;
  tier: string;
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
};

export type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AnalyticsDayView = {
  date: string;
  views: number;
};
