export type PublicBlogContext = {
  id: string;
  title: string;
  description: string | null;
  customCss: string | null;
  username: string;
};

export type PublicRequestContext = {
  hostname: string;
  isRootHost: boolean;
  blogUsername: string | null;
  blog: PublicBlogContext | null;
  scheme: 'http' | 'https';
};
