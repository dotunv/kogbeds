'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Blog, Post, Pagination } from '@/lib/types';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { SubscribeBar } from '@/components/blog/SubscribeBar';
import { formatDate } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Props = { username: string; tag?: string; page?: number };

export function BlogHomePage({ username, tag: initialTag }: Props) {
  const [blog, setBlog]         = useState<Blog | null>(null);
  const [posts, setPosts]       = useState<Post[]>([]);
  const [meta, setMeta]         = useState<Pagination | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(initialTag ?? null);
  const [page, setPage]         = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get<Blog>(`/blogs/${username}`)
      .then(setBlog)
      .catch(() => setNotFound(true));
  }, [username]);

  useEffect(() => {
    setPage(1);
    setPosts([]);
    fetchPosts(1, activeTag);
  }, [username, activeTag]);

  async function fetchPosts(p: number, tag: string | null) {
    const qs = new URLSearchParams({ page: String(p), limit: '20', status: 'published' });
    if (tag) qs.set('tag', tag);
    const res = await fetch(`${API}/posts?${qs}`, {
      headers: { 'x-blog-slug': username },
    }).then((r) => r.json());
    if (p === 1) setPosts(res.data ?? []);
    else setPosts((prev) => [...prev, ...(res.data ?? [])]);
    setMeta(res.meta);
    return res;
  }

  async function loadMore() {
    setLoadingMore(true);
    await fetchPosts(page + 1, activeTag);
    setPage((p) => p + 1);
    setLoadingMore(false);
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: 'var(--color-ink)', marginBottom: '8px' }}>This blog doesn't exist.</p>
          <a href="/" style={{ color: 'var(--color-accent)', fontSize: '14px' }}>← Go to Grizzly</a>
        </div>
      </div>
    );
  }

  if (!blog) return null;

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags.map((t) => t.name))));
  const accentColor = blog.accentColor ?? '#2D6BE4';
  const hasMore = meta ? page < meta.totalPages : false;

  return (
    <div
      style={{ background: 'var(--color-canvas)', minHeight: '100vh' }}
      data-theme={undefined}
    >
      {/* Blog header */}
      <header
        style={{
          maxWidth: 'var(--max-content)',
          margin: '0 auto',
          padding: '64px 24px 40px',
          borderLeft: `4px solid ${accentColor}`,
          paddingLeft: '28px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-reading)',
            fontSize: '48px',
            fontWeight: 600,
            lineHeight: 1.1,
            color: 'var(--color-ink)',
            marginBottom: '12px',
          }}
        >
          {blog.title || `${username}'s blog`}
        </h1>
        {blog.description && (
          <p style={{ fontFamily: 'var(--font-reading)', fontSize: '18px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
            {blog.description}
          </p>
        )}
      </header>

      <main style={{ maxWidth: 'var(--max-content)', margin: '0 auto', padding: '0 24px 80px' }}>
        {/* Tag filters */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
            <Tag label="all" active={activeTag === null} onClick={() => setActiveTag(null)} />
            {allTags.map((t) => (
              <Tag key={t} label={t} active={activeTag === t} onClick={() => setActiveTag(activeTag === t ? null : t)} />
            ))}
          </div>
        )}

        {/* Post list */}
        {posts.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '15px', padding: '32px 0' }}>
            No posts yet.
          </p>
        ) : (
          posts.map((post, i) => (
            <article key={post.id}>
              {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />}
              <div style={{ padding: '24px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <Link href={`/${post.slug}`} style={{ textDecoration: 'none' }}>
                      <h2
                        style={{
                          fontFamily: 'var(--font-reading)',
                          fontSize: '22px',
                          fontWeight: 600,
                          color: 'var(--color-ink)',
                          marginBottom: '6px',
                          lineHeight: 1.3,
                        }}
                      >
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p style={{ fontSize: '15px', color: 'var(--color-muted)', margin: '0 0 8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                          {post.excerpt}
                        </p>
                      )}
                    </Link>
                    {post.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {post.tags.map((t) => (
                          <Tag key={t.id} label={`#${t.name}`} active={activeTag === t.name} onClick={() => setActiveTag(t.name)} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-muted)', whiteSpace: 'nowrap', fontFamily: 'var(--font-ui)' }}>
                    {post.publishedAt ? formatDate(post.publishedAt) : ''}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}

        {hasMore && (
          <div style={{ marginTop: '24px' }}>
            <Button variant="ghost" onClick={loadMore} loading={loadingMore}>Load more</Button>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '48px 0' }} />

        <SubscribeBar blogId={blog.id} username={username} accentColor={accentColor} />

        <footer style={{ marginTop: '48px', fontSize: '13px', color: 'var(--color-faint)', fontFamily: 'var(--font-ui)' }}>
          {blog.footerText && <p style={{ marginBottom: '8px' }}>{blog.footerText}</p>}
          <a href="/" style={{ color: 'var(--color-faint)', textDecoration: 'none' }}>Powered by Grizzly ↗</a>
        </footer>
      </main>
    </div>
  );
}
