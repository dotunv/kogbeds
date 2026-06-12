'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Post, Pagination } from '@/lib/types';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { formatDate, getPostUrl, getBlogUrl } from '@/lib/utils';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

type PostItem = Post & { blog: { slug: string; title: string; accentColor: string } };

export function DiscoverPage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    api.get<string[]>('/discover/tags').then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setPosts([]);
    fetchPosts(1, activeTag).then(({ data, meta }) => {
      setPosts(data);
      setMeta(meta);
      setLoading(false);
    });
  }, [activeTag]);

  async function fetchPosts(p: number, tag: string | null) {
    const qs = new URLSearchParams({ page: String(p), limit: '20' });
    if (tag) qs.set('tag', tag);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/discover?${qs}`,
    ).then((r) => r.json());
    return { data: res.data as PostItem[], meta: res.meta as Pagination };
  }

  async function loadMore() {
    setLoadingMore(true);
    const next = page + 1;
    const { data, meta: m } = await fetchPosts(next, activeTag);
    setPosts((prev) => [...prev, ...data]);
    setMeta(m);
    setPage(next);
    setLoadingMore(false);
  }

  const hasMore = meta ? page < meta.totalPages : false;

  return (
    <div
      style={{ background: 'var(--color-canvas)', minHeight: '100vh', fontFamily: 'var(--font-ui)' }}
    >
      {/* Nav */}
      <nav
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <div
          style={{
            maxWidth: 'var(--max-dashboard)',
            margin: '0 auto',
            padding: '0 24px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: 'var(--font-reading)',
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              textDecoration: 'none',
            }}
          >
            grizzly
          </Link>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/login'}>
              Sign in
            </Button>
            <Button size="sm" onClick={() => window.location.href = '/register'}>
              Start writing
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main
        style={{
          maxWidth: 'var(--max-content)',
          margin: '0 auto',
          padding: '48px 24px',
        }}
      >
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: '28px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-ink)' }}>
          Discover
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '16px', marginBottom: '32px' }}>
          Recent writing from across Grizzly
        </p>

        {/* Tag filters */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
            <Tag
              label="all"
              active={activeTag === null}
              onClick={() => setActiveTag(null)}
            />
            {tags.slice(0, 12).map((t) => (
              <Tag
                key={t}
                label={t}
                active={activeTag === t}
                onClick={() => setActiveTag(activeTag === t ? null : t)}
              />
            ))}
          </div>
        )}

        {/* Post list */}
        {loading ? (
          <div style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading…</div>
        ) : posts.length === 0 ? (
          <div style={{ color: 'var(--color-muted)', fontSize: '15px', padding: '48px 0' }}>
            No public posts yet. Be the first to publish.{' '}
            <Link href="/register" style={{ color: 'var(--color-accent)' }}>Start writing</Link>
          </div>
        ) : (
          <div>
            {posts.map((post, i) => (
              <article key={post.id}>
                {i > 0 && (
                  <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0' }} />
                )}
                <div style={{ padding: '24px 0' }}>
                  <Link
                    href={getPostUrl(post.blog.slug, post.slug, ROOT_DOMAIN)}
                    style={{ textDecoration: 'none' }}
                  >
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
                      <p
                        style={{
                          fontSize: '15px',
                          color: 'var(--color-muted)',
                          marginBottom: '10px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <a
                      href={getBlogUrl(post.blog.slug, ROOT_DOMAIN)}
                      style={{ fontSize: '13px', color: 'var(--color-muted)', textDecoration: 'none' }}
                    >
                      {post.blog.slug}.{ROOT_DOMAIN.split(':')[0]}
                    </a>
                    <span style={{ fontSize: '13px', color: 'var(--color-faint)' }}>·</span>
                    <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                      {post.publishedAt ? formatDate(post.publishedAt) : ''}
                    </span>
                    {post.tags.map((t) => (
                      <Tag
                        key={t.id}
                        label={`#${t.name}`}
                        active={activeTag === t.name}
                        onClick={() => setActiveTag(activeTag === t.name ? null : t.name)}
                      />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {hasMore && (
          <div style={{ marginTop: '32px' }}>
            <Button variant="ghost" onClick={loadMore} loading={loadingMore}>
              Load more
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
