'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Post, Pagination } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
type Filter = 'all' | 'PUBLISHED' | 'DRAFT' | 'SCHEDULED';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'DRAFT',     label: 'Drafts' },
  { key: 'SCHEDULED', label: 'Scheduled' },
];

export function PostsListPage({ pubSlug }: { pubSlug: string }) {
  const [posts, setPosts]       = useState<Post[]>([]);
  const [filter, setFilter]     = useState<Filter>('all');
  const [loading, setLoading]   = useState(true);
  const [meta, setMeta]         = useState<Pagination | null>(null);
  const [page, setPage]         = useState(1);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchPosts(1, filter).finally(() => setLoading(false));
  }, [filter, pubSlug]);

  async function fetchPosts(p: number, f: Filter) {
    const tk = localStorage.getItem('access_token') ?? '';
    const qs = new URLSearchParams({ page: String(p), limit: '20' });
    if (f !== 'all') qs.set('status', f);
    const res = await fetch(`${API}/publications/${pubSlug}/posts?${qs}`, {
      headers: { Authorization: `Bearer ${tk}` },
    }).then((r) => r.json());
    if (p === 1) setPosts(res.data ?? []);
    else setPosts((prev) => [...prev, ...(res.data ?? [])]);
    setMeta(res.meta);
  }

  async function deletePost(slug: string) {
    const tk = localStorage.getItem('access_token') ?? '';
    await fetch(`${API}/publications/${pubSlug}/posts/${slug}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tk}` },
    });
    setPosts((prev) => prev.filter((p) => p.slug !== slug));
    setMenuOpen(null);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>Posts</h1>
        <Link href="/dashboard/editor/new">
          <Button size="sm">
            <Plus size={13} style={{ marginRight: '5px' }} />
            New post
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid var(--color-border)' }}>
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '8px 14px',
                fontSize: '13.5px',
                fontFamily: 'var(--font-ui)',
                fontWeight: active ? 500 : 400,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: active ? 'var(--color-ink)' : 'var(--color-muted)',
                borderBottom: `2px solid ${active ? 'var(--color-ink)' : 'transparent'}`,
                marginBottom: '-1px',
                transition: 'color var(--duration-fast)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '14.5px', marginBottom: '16px' }}>
            {filter === 'all' ? 'No posts yet.' : `No ${filter.toLowerCase()} posts.`}
          </p>
          {filter === 'all' && (
            <Link href="/dashboard/editor/new">
              <Button size="sm">Write your first post</Button>
            </Link>
          )}
        </div>
      )}

      {/* Post rows */}
      <div ref={menuRef}>
        {posts.map((post, i) => (
          <article key={post.id} style={{ position: 'relative' }}>
            {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />}
            <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              {/* Main content */}
              <Link
                href={`/dashboard/editor/${post.slug}`}
                style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
              >
                <p style={{
                  fontSize: '14.5px',
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                  margin: '0 0 4px',
                  fontFamily: 'var(--font-ui)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {post.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <StatusBadge status={post.status ?? (post.isPublished ? 'PUBLISHED' : 'DRAFT')} />
                  <span style={{ fontSize: '12px', color: 'var(--color-faint)' }}>
                    {post.status === 'PUBLISHED' && post.publishedAt
                      ? formatDate(post.publishedAt)
                      : post.status === 'SCHEDULED' && post.scheduledAt
                      ? `Scheduled ${formatDate(post.scheduledAt)}`
                      : `Edited ${formatDate(post.updatedAt)}`}
                  </span>
                  {!!post._count?.comments && (
                    <span style={{ fontSize: '12px', color: 'var(--color-faint)' }}>{post._count.comments} comments</span>
                  )}
                </div>
              </Link>

              {/* Menu */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === post.id ? null : post.id); }}
                  style={{
                    padding: '5px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-faint)',
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color var(--duration-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-faint)')}
                >
                  <MoreHorizontal size={15} />
                </button>
                {menuOpen === post.id && (
                  <div style={{
                    position: 'absolute', right: 0, top: '28px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 10,
                    minWidth: '140px',
                    overflow: 'hidden',
                  }}>
                    <Link
                      href={`/dashboard/editor/${post.slug}`}
                      style={{ display: 'block', padding: '8px 14px', fontSize: '13px', color: 'var(--color-ink)', textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-canvas)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deletePost(post.slug)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 14px', fontSize: '13px', color: 'var(--color-danger)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-danger-light)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {meta && page < meta.totalPages && (
        <div style={{ marginTop: '20px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { const next = page + 1; setPage(next); fetchPosts(next, filter); }}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
