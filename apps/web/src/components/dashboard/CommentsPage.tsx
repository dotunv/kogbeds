'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Comment } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const token = () => localStorage.getItem('access_token') ?? '';

type Filter = 'PENDING' | 'APPROVED' | 'SPAM';

export function CommentsPage() {
  const [comments, setComments] = useState<(Comment & { postTitle?: string })[]>([]);
  const [filter, setFilter]     = useState<Filter>('PENDING');
  const [loading, setLoading]   = useState(true);
  const [undoQueue, setUndoQueue] = useState<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/comments/pending?status=${filter}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((r) => { setComments(r.data ?? []); setLoading(false); });
  }, [filter]);

  async function moderate(id: string, status: 'APPROVED' | 'SPAM' | 'REJECTED') {
    await fetch(`${API}/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status }),
    });
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  function deleteWithUndo(id: string) {
    // Remove from UI immediately; fire API after 3s unless cancelled
    setComments((prev) => prev.filter((c) => c.id !== id));
    const timer = setTimeout(() => {
      fetch(`${API}/comments/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      setUndoQueue((m) => { const n = new Map(m); n.delete(id); return n; });
    }, 3000);
    setUndoQueue((m) => new Map(m).set(id, timer));
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'PENDING',  label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'SPAM',     label: 'Spam' },
  ];

  const pendingCount = filter === 'PENDING' ? comments.length : 0;

  return (
    <div style={{ fontFamily: 'var(--font-ui)' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '24px' }}>Comments</h1>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ padding: '8px 14px', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', color: filter === key ? 'var(--color-accent)' : 'var(--color-muted)', borderBottom: filter === key ? '2px solid var(--color-accent)' : '2px solid transparent', marginBottom: '-1px', fontWeight: filter === key ? 500 : 400, fontFamily: 'var(--font-ui)' }}
          >
            {label}{key === 'PENDING' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading…</p>}

      {!loading && comments.length === 0 && (
        <p style={{ color: 'var(--color-muted)', fontSize: '15px', padding: '32px 0' }}>
          {filter === 'PENDING' ? 'No comments waiting for review.' : `No ${filter.toLowerCase()} comments yet.`}
        </p>
      )}

      <div>
        {comments.map((c, i) => (
          <div key={c.id}>
            {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />}
            <div style={{ padding: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                  {c.postTitle ? `On "${c.postTitle}"` : 'Comment'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{formatDate(c.createdAt)}</span>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '6px' }}>
                {c.authorName ?? 'Anonymous'}
              </p>
              <p style={{ fontSize: '14px', color: 'var(--color-ink)', lineHeight: 1.6, marginBottom: '12px', fontFamily: 'var(--font-reading)' }}>
                "{c.body}"
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {filter === 'PENDING' && (
                  <Button size="sm" onClick={() => moderate(c.id, 'APPROVED')}>Approve</Button>
                )}
                {filter !== 'SPAM' && (
                  <Button size="sm" variant="ghost" onClick={() => moderate(c.id, 'SPAM')}>Spam</Button>
                )}
                <Button size="sm" variant="danger" onClick={() => deleteWithUndo(c.id)}>Delete</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Undo toast area */}
      {undoQueue.size > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-ink)', color: 'var(--color-canvas)', padding: '10px 16px', borderRadius: 'var(--radius)', fontSize: '13px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: 'var(--shadow-md)', fontFamily: 'var(--font-ui)' }}>
          Comment deleted.
          <button
            onClick={() => {
              undoQueue.forEach((timer, id) => {
                clearTimeout(timer);
                fetch(`${API}/comments/pending?status=${filter}`, { headers: { Authorization: `Bearer ${token()}` } })
                  .then((r) => r.json())
                  .then((r) => setComments(r.data ?? []));
              });
              setUndoQueue(new Map());
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: '13px', fontFamily: 'var(--font-ui)' }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
