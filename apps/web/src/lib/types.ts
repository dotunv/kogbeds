export type PublicationType = 'BLOG' | 'NEWSLETTER' | 'BOTH';

export type Publication = {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string;
  type: PublicationType;
  accentColor: string;
  coverImageUrl: string | null;
  faviconUrl: string | null;
  footerText: string;
  customDomain: string | null;
  domainVerified: boolean;
  domainTxtRecord: string | null;
  isPublic: boolean;
  monthlyPriceUsd: string | null;
  yearlyPriceUsd: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    posts: number;
    subscribers: number;
  };
};

/** @deprecated Use Publication instead */
export type Blog = Publication;

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
export type PostFormat = 'MARKDOWN' | 'BLOCKS';

export type Post = {
  id: string;
  publicationId: string;
  /** @deprecated Use publicationId */
  blogId?: string;
  title: string;
  slug: string;
  excerpt: string;
  format: PostFormat;
  markdownContent: string | null;
  /** @deprecated Use markdownContent */
  contentMarkdown?: string | null;
  blocks: Block[] | null;
  contentHtml?: string | null;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  status: PostStatus;
  /** @deprecated Use status === 'PUBLISHED' */
  isPublished?: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  isPaywalled: boolean;
  deletedAt: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    comments: number;
    views?: number;
  };
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
  updatedAt: string;
};

export type Subscriber = {
  id: string;
  publicationId: string;
  /** @deprecated Use publicationId */
  blogId?: string;
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

export type EbookStatus = 'DRAFT' | 'PUBLISHED';

export type Ebook = {
  id: string;
  userId: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  priceUsd: string | null;
  isFreeForSubscribers: boolean;
  status: EbookStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  chapters?: EbookChapter[];
  _count?: {
    chapters: number;
  };
};

export type EbookChapter = {
  id: string;
  ebookId: string;
  title: string;
  order: number;
  format: PostFormat;
  markdownContent: string | null;
  blocks: Block[] | null;
  createdAt: string;
  updatedAt: string;
};
