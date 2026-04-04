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

const jsonLdSafe = (value: unknown): string => {
  return JSON.stringify(value).replace(/</g, '\\u003c');
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
  canonicalUrl: string;
  posts: BlogHomePostItem[];
};

type RenderPostInput = {
  blogTitle: string;
  blogDescription: string | null;
  customCss: string | null;
  canonicalUrl: string;
  post: {
    title: string;
    contentHtml: string | null;
    contentMarkdown: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
    excerpt: string | null;
  };
  comments?: { authorName: string | null; body: string; createdAt: Date }[];
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
  canonicalUrl: string;
};

type RenderDiscoverFeedXmlInput = {
  siteBaseUrl: string;
  appDomain: string;
  items: DiscoverPostItem[];
};

export type PageShellSeo = {
  canonicalUrl: string;
  metaDescription?: string | null;
  jsonLd?: Record<string, unknown> | null;
};

const formatDate = (value: Date | null): string | null => {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString().slice(0, 10);
};

const formatIso = (value: Date): string => {
  return new Date(value).toISOString();
};

const pageShell = (
  title: string,
  bodyContent: string,
  customCss: string | null,
  description: string | null | undefined,
  seo: PageShellSeo,
): string => {
  const safeTitle = escapeHtml(title);
  const metaDesc =
    (seo.metaDescription ?? description)
      ? escapeHtml((seo.metaDescription ?? description ?? '').slice(0, 320))
      : '';
  const cssBlock = customCss ? `<style>${customCss}</style>` : '';
  const canonical = escapeHtml(seo.canonicalUrl);
  const jsonBlock = seo.jsonLd
    ? `<script type="application/ld+json">${jsonLdSafe(seo.jsonLd)}</script>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  ${metaDesc ? `<meta name="description" content="${metaDesc}" />` : ''}
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:type" content="website" />
  ${metaDesc ? `<meta property="og:description" content="${metaDesc}" />` : ''}
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
    .embed { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem 0; }
    .embed iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
  </style>
  ${cssBlock}
  ${jsonBlock}
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
  <nav><a href="/feed.xml">RSS</a> · <a href="/sitemap.xml">Sitemap</a></nav>
</header>
<main>
  ${postsHtml}
</main>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: input.blogTitle,
    description: input.blogDescription ?? undefined,
    url: input.canonicalUrl,
  };

  return pageShell(
    input.blogTitle,
    body,
    input.customCss,
    input.blogDescription ?? null,
    {
      canonicalUrl: input.canonicalUrl,
      metaDescription: input.blogDescription,
      jsonLd,
    },
  );
};

export const renderPostHtml = (input: RenderPostInput): string => {
  const publishedAt = formatDate(input.post.publishedAt);
  const commentsHtml =
    input.comments && input.comments.length > 0
      ? `<section class="comments">
  <h3>Comments</h3>
  ${input.comments
    .map(
      (c) => `<article class="comment">
    <p class="meta">${escapeHtml(c.authorName ?? 'Anonymous')} · ${escapeHtml(formatIso(c.createdAt))}</p>
    <p>${escapeHtml(c.body)}</p>
  </article>`,
    )
    .join('\n')}
</section>`
      : '';

  const body = `<header>
  <h1><a href="/">${escapeHtml(input.blogTitle)}</a></h1>
  ${input.blogDescription ? `<p>${escapeHtml(input.blogDescription)}</p>` : ''}
  <nav><a href="/">Home</a> · <a href="/feed.xml">RSS</a></nav>
</header>
<main>
  <article>
    <h2>${escapeHtml(input.post.title)}</h2>
    ${publishedAt ? `<p class="meta">${escapeHtml(publishedAt)}</p>` : ''}
    <div>${input.post.contentHtml ?? escapeHtml(input.post.contentMarkdown ?? '')}</div>
  </article>
  ${commentsHtml}
</main>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.post.title,
    datePublished: input.post.publishedAt
      ? formatIso(input.post.publishedAt)
      : undefined,
    dateModified: formatIso(input.post.updatedAt),
    description: input.post.excerpt ?? undefined,
    url: input.canonicalUrl,
    mainEntityOfPage: input.canonicalUrl,
  };

  return pageShell(
    `${input.post.title} - ${input.blogTitle}`,
    body,
    input.customCss,
    input.post.excerpt ?? input.blogDescription,
    {
      canonicalUrl: input.canonicalUrl,
      metaDescription: input.post.excerpt ?? input.blogDescription,
      jsonLd,
    },
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
  <nav><a href="/feed.xml">Discover RSS</a> · <a href="/sitemap.xml">Sitemap</a></nav>
</header>
<main>
  <h2>Discover recent posts</h2>
  ${postsHtml}
</main>`;

  return pageShell('Grizzly · Discover', body, null, 'Discover public posts', {
    canonicalUrl: input.canonicalUrl,
    metaDescription: 'Discover public posts across Grizzly blogs',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Grizzly Discover',
      url: input.canonicalUrl,
    },
  });
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

export const renderUrlSetXml = (
  urls: { loc: string; lastmod?: string }[],
): string => {
  const items = urls
    .map((u) => {
      const loc = escapeHtml(u.loc);
      const lm = u.lastmod
        ? `\n  <lastmod>${escapeHtml(u.lastmod)}</lastmod>`
        : '';
      return `<url>
  <loc>${loc}</loc>${lm}
</url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`;
};

export const renderRobotsTxt = (input: {
  siteBaseUrl: string;
  sitemapUrl: string;
}): string => {
  const lines = ['User-agent: *', 'Disallow:', `Sitemap: ${input.sitemapUrl}`];
  return `${lines.join('\n')}\n`;
};
