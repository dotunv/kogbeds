'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Publication, Post, Pagination } from '@/lib/types';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { SubscribeBar } from '@/components/blog/SubscribeBar';
import { formatDate } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Props = { username: string; tag?: string; page?: number };

export function BlogHomePage({ username, tag: initialTag }: Props) {
  const [blog, setBlog]             = useState<Publication | null>(null);
  const [posts, setPosts]           = useState<Post[]>([]);
  const [meta, setMeta]             = useState<Pagination | null>(null);
  const [activeTag, setActiveTag]   = useState<string | null>(initialTag ?? null);
  const [page, setPage]             = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notFound, setNotFound]     = useState(false);

  useEffect(() => {
    fetch(`${API}/publications/${username}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r) => setBlog(r.data ?? r))
      .catch(() => setNotFound(true));
  }, [username]);

  useEffect(() => {
    setPage(1);
    setPosts([]);
    fetchPosts(1, activeTag);
  }, [username, activeTag]);

  async function fetchPosts(p: number, tag: string | null) {
    const qs = new URLSearchParams({ page: String(p), limit: '20', status: 'PUBLISHED' });
    if (tag) qs.set('tag', tag);
    const res = await fetch(`${API}/publications/${username}/posts?${qs}`).then((r) => r.json());
    if (p === 1) setPosts(res.data ?? []);
    else setPosts((prev) => [...prev, ...(res.data ?? [])]);
    setMeta(res.meta);
  }

  async function loadMore() {
    setLoadingMore(true);
    await fetchPosts(page + 1, activeTag);
    setPage((p) => p + 1);
    setLoadingMore(false);
  }

  if (notFound) return <Unavailable />;
  if (!blog) return null;

  const allTags   = Array.from(new Set(posts.flatMap((p) => p.tags.map((t) => t.name))));
  const accent    = blog.accentColor ?? '#2D6BE4';
  const showSub   = blog.type === 'NEWSLETTER' || blog.type === 'BOTH';
  const hasMore   = meta ? page < meta.totalPages : false;

  return (
    <div style={{ background: 'var(--color-canvas)', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header style={{
        maxWidth: 'var(--max-content)',
        margin: '0 auto',
        padding: '72px 24px 56px',
      }}>
        {/* Accent dot */}
        <span style={{
          display: 'inline-block',
          width: '8px', height: '8px',
          borderRadius: '50%',
          background: accent,
          marginBottom: '20px',
        }} />
        <h1 style={{
          fontFamily: 'var(--font-reading)',
          fontSize: '40px',
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: 'var(--color-ink)',
          margin: '0 0 14px',
        }}>
          {blog.title || `${username}'s blog`}
        </h1>
        {blog.description && (
          <p style={{
            fontFamily: 'var(--font-reading)',
            fontSize: '17px',
            color: 'var(--color-muted)',
            lineHeight: 1.65,
            maxWidth: '52ch',
            margin: 0,
          }}>
            {blog.description}
          </p>
        )}
        {showSub && (
          <div style={{ marginTop: '28px' }}>
            <SubscribeBar blogId={blog.id} username={username} accentColor={accent} inline />
          </div>
        )}
      </header>

      {/* ── Divider ── */}
      <div style={{ maxWidth: 'var(--max-content)', margin: '0 auto', padding: '0 24px' }}>
        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />
      </div>

      <main style={{ maxWidth: 'var(--max-content)', margin: '0 auto', padding: '0 24px 96px' }}>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '24px 0 0' }}>
            <Tag label="All" active={activeTag === null} onClick={() => setActiveTag(null)} />
            {allTags.map((t) => (
              <Tag key={t} label={t} active={activeTag === t} onClick={() => setActiveTag(activeTag === t ? null : t)} />
            ))}
          </div>
        )}

        {/* Post list */}
        {posts.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '15px', padding: '48px 0' }}>
            No posts yet.
          </p>
        ) : (
          <div style={{ marginTop: allTags.length > 0 ? '0' : '0' }}>
            {posts.map((post, i) => (
              <article key={post.id}>
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />
                <Link href={`/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div
                    style={{ padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget.querySelector('h2') as HTMLElement | null)?.style.setProperty('color', accent);
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget.querySelector('h2') as HTMLElement | null)?.style.setProperty('color', 'var(--color-ink)');
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{
                        fontFamily: 'var(--font-reading)',
                        fontSize: '19px',
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                        lineHeight: 1.35,
                        marginBottom: '6px',
                        transition: 'color var(--duration-fast)',
                      }}>
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p style={{
                          fontSize: '14.5px',
                          color: 'var(--color-muted)',
                          lineHeight: 1.55,
                          margin: 0,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          {post.excerpt}
                        </p>
                      )}
                      {post.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                          {post.tags.map((t) => (
                            <span
                              key={t.id}
                              onClick={(e) => { e.preventDefault(); setActiveTag(activeTag === t.name ? null : t.name); }}
                              style={{
                                fontSize: '12px',
                                color: activeTag === t.name ? accent : 'var(--color-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              #{t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <time style={{
                      fontSize: '13px',
                      color: 'var(--color-faint)',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--font-ui)',
                      paddingTop: '3px',
                      flexShrink: 0,
                    }}>
                      {post.publishedAt ? formatDate(post.publishedAt) : ''}
                    </time>
                  </div>
                </Link>
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

        {/* Footer */}
        <footer style={{ marginTop: '72px', fontSize: '12px', color: 'var(--color-faint)', fontFamily: 'var(--font-ui)' }}>
          {blog.footerText || (
            <span>Published with <a href="/" style={{ color: 'var(--color-faint)', textDecoration: 'underline', textDecorationColor: 'var(--color-border)' }}>Grizzly</a></span>
          )}
        </footer>
      </main>
    </div>
  );
}

function Unavailable() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '12px' }}>This publication isn't available.</p>
        <a href="/" style={{ color: 'var(--color-accent)', fontSize: '13px', textDecoration: 'none' }}>← Back to Grizzly</a>
      </div>
    </div>
  );
}
