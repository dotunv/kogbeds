'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Subscriber } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const token = () => localStorage.getItem('access_token') ?? '';

type Filter = 'all' | 'confirmed' | 'pending';

export function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filter, setFilter]   = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/subscribers`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((r) => { setSubscribers(r.data ?? []); setLoading(false); });
  }, []);

  async function remove(id: string) {
    await fetch(`${API}/subscribers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
    setConfirm(null);
  }

  const filtered = subscribers.filter((s) => {
    if (filter === 'confirmed') return s.confirmed;
    if (filter === 'pending')   return !s.confirmed;
    return true;
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'pending',   label: 'Pending' },
  ];

  return (
    <div style={{ fontFamily: 'var(--font-ui)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)' }}>
          Subscribers <span style={{ fontSize: '16px', color: 'var(--color-muted)', fontWeight: 400 }}>{subscribers.length} total</span>
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ padding: '8px 14px', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', color: filter === key ? 'var(--color-accent)' : 'var(--color-muted)', borderBottom: filter === key ? '2px solid var(--color-accent)' : '2px solid transparent', marginBottom: '-1px', fontWeight: filter === key ? 500 : 400, fontFamily: 'var(--font-ui)' }}
          >{label}</button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p style={{ color: 'var(--color-muted)', fontSize: '15px', padding: '32px 0' }}>
          No subscribers yet. Publish a post to start growing your audience.
        </p>
      )}

      <div>
        {filtered.map((s, i) => (
          <div key={s.id}>
            {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
              <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-ink)' }}>{s.email}</span>
              <span style={{ fontSize: '13px', color: s.confirmed ? 'var(--color-success)' : 'var(--color-muted)', minWidth: '80px' }}>
                {s.confirmed ? 'Confirmed' : 'Pending'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)', minWidth: '80px' }}>
                {formatDate(s.createdAt)}
              </span>
              {confirm === s.id ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  Remove?
                  <button onClick={() => remove(s.id)} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-ui)' }}>Yes</button>
                  <button onClick={() => setConfirm(null)} style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-ui)' }}>Cancel</button>
                </span>
              ) : (
                <button onClick={() => setConfirm(s.id)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', opacity: 0.7, borderRadius: 'var(--radius)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
