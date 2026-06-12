'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Post, Pagination } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
type Filter = 'all' | 'PUBLISHED' | 'DRAFT' | 'SCHEDULED';

export function PostsListPage() {
  const [posts, setPosts]     = useState<Post[]>([]);
  const [filter, setFilter]   = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta]       = useState<Pagination | null>(null);
  const [page, setPage]       = useState(1);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchPosts(1, filter).finally(() => setLoading(false));
  }, [filter]);

  async function fetchPosts(p: number, f: Filter) {
    const token = localStorage.getItem('access_token') ?? '';
    const qs = new URLSearchParams({ page: String(p), limit: '20' });
    if (f !== 'all') qs.set('status', f.toLowerCase());
    const res = await fetch(`${API}/posts?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    if (p === 1) setPosts(res.data ?? []);
    else setPosts((prev) => [...prev, ...(res.data ?? [])]);
    setMeta(res.meta);
  }

  async function deletePost(slug: string) {
    const token = localStorage.getItem('access_token') ?? '';
    await fetch(`${API}/posts/${slug}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setPosts((prev) => prev.filter((p) => p.slug !== slug));
    setMenuOpen(null);
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'PUBLISHED', label: 'Published' },
    { key: 'DRAFT', label: 'Drafts' },
    { key: 'SCHEDULED', label: 'Scheduled' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)' }}>Posts</h1>
        <Link href="/dashboard/editor/new">
          <Button size="sm">
            <Plus size={14} style={{ marginRight: '6px' }} />
            New post
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '8px 14px',
              fontSize: '14px',
              fontFamily: 'var(--font-ui)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: filter === key ? 'var(--color-accent)' : 'var(--color-muted)',
              borderBottom: filter === key ? '2px solid var(--color-accent)' : '2px solid transparent',
              marginBottom: '-1px',
              fontWeight: filter === key ? 500 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '15px', marginBottom: '16px' }}>
            {filter === 'all' ? 'Your blog is ready. Write your first post.' : `No ${filter.toLowerCase()} posts.`}
          </p>
          {filter === 'all' && (
            <Link href="/dashboard/editor/new">
              <Button>Write a post</Button>
            </Link>
          )}
        </div>
      )}

      {/* Post rows */}
      <div>
        {posts.map((post, i) => (
          <article key={post.id} style={{ position: 'relative' }}>
            {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />}
            <div
              style={{
                padding: '16px 0',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-canvas)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Link href={`/dashboard/editor/${post.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px', fontFamily: 'var(--font-ui)' }}>
                  {post.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <StatusBadge status={post.status} />
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                    {post.status === 'PUBLISHED' && post.publishedAt
                      ? formatDate(post.publishedAt)
                      : post.status === 'SCHEDULED' && post.scheduledAt
                      ? `Scheduled · ${formatDate(post.scheduledAt)}`
                      : `Edited ${formatDate(post.updatedAt)}`}
                  </span>
                  {post.status === 'PUBLISHED' && typeof post.viewCount === 'number' && (
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{post.viewCount} views</span>
                  )}
                  {post._count?.comments != null && post._count.comments > 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{post._count.comments} comments</span>
                  )}
                </div>
              </Link>

              {/* 3-dot menu */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === post.id ? null : post.id); }}
                  style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', borderRadius: 'var(--radius)', opacity: 0.7 }}
                >
                  <MoreHorizontal size={16} />
                </button>
                {menuOpen === post.id && (
                  <div
                    style={{
                      position: 'absolute', right: 0, top: '28px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow-md)',
                      zIndex: 10,
                      minWidth: '140px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[
                      { label: 'Edit', href: `/dashboard/editor/${post.id}` },
                    ].map(({ label, href }) => (
                      <Link key={label} href={href} style={{ display: 'block', padding: '8px 14px', fontSize: '13px', color: 'var(--color-ink)', textDecoration: 'none' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-canvas)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >{label}</Link>
                    ))}
                    <button
                      onClick={() => deletePost(post.slug)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: '13px', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
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
        <div style={{ marginTop: '24px' }}>
          <Button variant="ghost" onClick={() => { const next = page + 1; setPage(next); fetchPosts(next, filter); }}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
