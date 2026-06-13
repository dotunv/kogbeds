'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Props = { blogId: string; username: string; accentColor: string; inline?: boolean };

export function SubscribeBar({ username, accentColor }: Props) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-blog-slug': username },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed');
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ padding: '24px 0', fontFamily: 'var(--font-ui)' }}>
        <p style={{ fontSize: '15px', color: 'var(--color-ink)' }}>
          Check your inbox to confirm your subscription.
        </p>
      </div>
    );
  }

  return (
    <section style={{ padding: '24px 0', fontFamily: 'var(--font-ui)' }}>
      <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '12px' }}>
        Stay in the loop
      </p>
      <form onSubmit={submit} style={{ display: 'flex', gap: '8px', maxWidth: '100%' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          required
          style={{
            flex: 1,
            height: '38px',
            padding: '0 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            color: 'var(--color-ink)',
            background: 'var(--color-surface)',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            height: '38px',
            padding: '0 16px',
            background: accentColor,
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)', marginTop: '6px' }}>{error}</p>}
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '8px' }}>
        No spam. Unsubscribe anytime.
      </p>
    </section>
  );
}
