'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Post, Pagination } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { formatDate, getPostUrl, getBlogUrl } from '@/lib/utils';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
const API         = process.env.NEXT_PUBLIC_API_URL     ?? 'http://localhost:3000';

type PostItem = Post & { publication: { slug: string; title: string; accentColor: string } };

export function DiscoverPage() {
  const [posts, setPosts]         = useState<PostItem[]>([]);
  const [tags, setTags]           = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const [meta, setMeta]           = useState<Pagination | null>(null);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetch(`${API}/discover/tags`).then((r) => r.json()).then((r) => setTags(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setPosts([]);
    fetchPosts(1, activeTag).then(({ data, meta: m }) => { setPosts(data); setMeta(m); setLoading(false); });
  }, [activeTag]);

  async function fetchPosts(p: number, tag: string | null) {
    const qs = new URLSearchParams({ page: String(p), limit: '20' });
    if (tag) qs.set('tag', tag);
    const res = await fetch(`${API}/discover?${qs}`).then((r) => r.json());
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
    <div style={{ background: 'var(--color-canvas)', minHeight: '100vh', fontFamily: 'var(--font-ui)' }}>

      {/* ── Top nav ── */}
      <nav style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-reading)',
            fontSize: '17px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--color-ink)',
            textDecoration: 'none',
          }}>
            grizzly
          </Link>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/login" style={{ fontSize: '13.5px', color: 'var(--color-muted)', textDecoration: 'none', padding: '0 4px' }}>
              Sign in
            </Link>
            <Button size="sm" onClick={() => window.location.href = '/register'}>
              Start writing
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Content ── */}
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '52px 24px 96px' }}>

        {/* Page heading */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{
            fontFamily: 'var(--font-reading)',
            fontSize: '26px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--color-ink)',
            margin: '0 0 6px',
          }}>
            Discover
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '14.5px', margin: 0 }}>
            Recent writing from across Grizzly
          </p>
        </div>

        {/* Tag pills */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '28px' }}>
            {[null, ...tags.slice(0, 14)].map((t) => (
              <button
                key={t ?? '__all'}
                onClick={() => setActiveTag(t)}
                style={{
                  padding: '4px 11px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: activeTag === t ? 'var(--color-ink)' : 'var(--color-border)',
                  background: activeTag === t ? 'var(--color-ink)' : 'transparent',
                  color: activeTag === t ? 'var(--color-canvas)' : 'var(--color-muted)',
                  fontSize: '12.5px',
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast)',
                }}
              >
                {t ?? 'All'}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ color: 'var(--color-faint)', fontSize: '14px', padding: '48px 0' }}>Loading…</div>
        ) : posts.length === 0 ? (
          <div style={{ color: 'var(--color-muted)', fontSize: '15px', padding: '48px 0', lineHeight: 1.6 }}>
            No posts yet.{' '}
            <Link href="/register" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>Be the first to write.</Link>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <article key={post.id}>
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />
                <a
                  href={getPostUrl(post.publication.slug, post.slug, ROOT_DOMAIN)}
                  style={{ textDecoration: 'none', display: 'block', padding: '22px 0' }}
                >
                  <h2 style={{
                    fontFamily: 'var(--font-reading)',
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                    lineHeight: 1.35,
                    margin: '0 0 6px',
                  }}>
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p style={{
                      fontSize: '14px',
                      color: 'var(--color-muted)',
                      lineHeight: 1.55,
                      margin: '0 0 10px',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {post.excerpt}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12.5px',
                      color: 'var(--color-muted)',
                    }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                        background: post.publication.accentColor ?? '#2D6BE4',
                      }} />
                      {post.publication.title || post.publication.slug}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-faint)' }}>·</span>
                    <time style={{ fontSize: '12.5px', color: 'var(--color-faint)' }}>
                      {post.publishedAt ? formatDate(post.publishedAt) : ''}
                    </time>
                    {post.tags.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        onClick={(e) => { e.preventDefault(); setActiveTag(activeTag === t.name ? null : t.name); }}
                        style={{ fontSize: '12px', color: 'var(--color-faint)', cursor: 'pointer' }}
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                </a>
              </article>
            ))}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />
          </div>
        )}

        {hasMore && (
          <div style={{ marginTop: '28px' }}>
            <Button variant="ghost" size="sm" onClick={loadMore} loading={loadingMore}>Load more</Button>
          </div>
        )}
      </main>
    </div>
  );
}
