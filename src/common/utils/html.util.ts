const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value: string): string => {
  return value.replace(/[&<>"']/g, (char) => ENTITY_MAP[char] ?? char);
};

type BlogHomePostItem = {
  title: string;
  slug: string;
  publishedAt: Date | null;
};

type RenderBlogHomeInput = {
  blogTitle: string;
  blogDescription: string | null;
  customCss: string | null;
  posts: BlogHomePostItem[];
};

type RenderPostInput = {
  blogTitle: string;
  blogDescription: string | null;
  customCss: string | null;
  post: {
    title: string;
    contentHtml: string | null;
    contentMarkdown: string;
    publishedAt: Date | null;
  };
};

type DiscoverPostItem = {
  title: string;
  slug: string;
  publishedAt: Date | null;
  updatedAt: Date;
  blog: {
    title: string;
    username: string;
  };
};

type RenderDiscoverInput = {
  appDomain: string;
  posts: DiscoverPostItem[];
};

type RenderDiscoverFeedXmlInput = {
  siteBaseUrl: string;
  appDomain: string;
  items: DiscoverPostItem[];
};

const formatDate = (value: Date | null): string | null => {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString().slice(0, 10);
};

const pageShell = (
  title: string,
  bodyContent: string,
  customCss: string | null,
  description?: string | null,
): string => {
  const safeTitle = escapeHtml(title);
  const safeDescription = description ? escapeHtml(description) : '';
  const cssBlock = customCss ? `<style>${customCss}</style>` : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  ${safeDescription ? `<meta name="description" content="${safeDescription}" />` : ''}
  <style>
    :root { color-scheme: light dark; }
    body { margin: 2rem auto; max-width: 760px; padding: 0 1rem; font-family: system-ui, sans-serif; line-height: 1.6; }
    h1, h2, h3 { line-height: 1.2; }
    a { color: inherit; }
    nav { margin-bottom: 2rem; }
    article { margin: 1.25rem 0; }
    .meta { opacity: 0.72; font-size: 0.92rem; }
    pre { overflow-x: auto; }
    img { max-width: 100%; height: auto; }
  </style>
  ${cssBlock}
</head>
<body>
${bodyContent}
</body>
</html>`;
};

export const renderBlogHomeHtml = (input: RenderBlogHomeInput): string => {
  const postsHtml = input.posts.length
    ? input.posts
        .map((post) => {
          const publishedAt = formatDate(post.publishedAt);
          return `<article>
  <h2><a href="/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2>
  ${publishedAt ? `<p class="meta">${escapeHtml(publishedAt)}</p>` : ''}
</article>`;
        })
        .join('\n')
    : '<p>No posts published yet.</p>';

  const body = `<header>
  <h1>${escapeHtml(input.blogTitle)}</h1>
  ${input.blogDescription ? `<p>${escapeHtml(input.blogDescription)}</p>` : ''}
  <nav><a href="/feed.xml">RSS</a></nav>
</header>
<main>
  ${postsHtml}
</main>`;

  return pageShell(
    input.blogTitle,
    body,
    input.customCss,
    input.blogDescription ?? null,
  );
};

export const renderPostHtml = (input: RenderPostInput): string => {
  const publishedAt = formatDate(input.post.publishedAt);
  const body = `<header>
  <h1><a href="/">${escapeHtml(input.blogTitle)}</a></h1>
  ${input.blogDescription ? `<p>${escapeHtml(input.blogDescription)}</p>` : ''}
  <nav><a href="/">Home</a> · <a href="/feed.xml">RSS</a></nav>
</header>
<main>
  <article>
    <h2>${escapeHtml(input.post.title)}</h2>
    ${publishedAt ? `<p class="meta">${escapeHtml(publishedAt)}</p>` : ''}
    <div>${input.post.contentHtml ?? escapeHtml(input.post.contentMarkdown)}</div>
  </article>
</main>`;

  return pageShell(
    `${input.post.title} - ${input.blogTitle}`,
    body,
    input.customCss,
    input.blogDescription ?? null,
  );
};

export const renderDiscoverHtml = (input: RenderDiscoverInput): string => {
  const postsHtml = input.posts.length
    ? input.posts
        .map((post) => {
          const publishedAt = formatDate(post.publishedAt);
          const host = `${post.blog.username}.${input.appDomain}`;
          return `<article>
  <h2><a href="https://${escapeHtml(host)}/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2>
  <p class="meta">
    from <a href="https://${escapeHtml(host)}">${escapeHtml(post.blog.title)}</a>
    (${escapeHtml(host)})
    ${publishedAt ? `· ${escapeHtml(publishedAt)}` : ''}
  </p>
</article>`;
        })
        .join('\n')
    : '<p>No public posts yet.</p>';

  const body = `<header>
  <h1>Grizzly</h1>
  <p>Simple multi-tenant blogs, inspired by Bear Blog.</p>
  <nav><a href="/feed.xml">Discover RSS</a></nav>
</header>
<main>
  <h2>Discover recent posts</h2>
  ${postsHtml}
</main>`;

  return pageShell('Grizzly · Discover', body, null, 'Discover public posts');
};

export const renderDiscoverFeedXml = (
  input: RenderDiscoverFeedXmlInput,
): string => {
  const channelTitle = 'Grizzly Discover';
  const channelDescription = 'Latest posts across public Grizzly blogs';

  const itemsXml = input.items
    .map((item) => {
      const host = `${item.blog.username}.${input.appDomain}`;
      const postUrl = `https://${host}/${item.slug}`;
      const pubDate = (item.publishedAt ?? item.updatedAt).toUTCString();
      const description = `From ${item.blog.title}: ${item.title}`;
      return `<item>
  <title>${escapeHtml(item.title)}</title>
  <link>${escapeHtml(postUrl)}</link>
  <guid>${escapeHtml(postUrl)}</guid>
  <pubDate>${escapeHtml(pubDate)}</pubDate>
  <description>${escapeHtml(description)}</description>
</item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeHtml(channelTitle)}</title>
  <link>${escapeHtml(input.siteBaseUrl)}</link>
  <description>${escapeHtml(channelDescription)}</description>
  ${itemsXml}
</channel>
</rss>`;
};
