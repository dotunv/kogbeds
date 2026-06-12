'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function ConfirmContent() {
  const params = useSearchParams();
  const token  = params.get('token') ?? '';
  const [blog, setBlog]     = useState<{ title: string; slug: string } | null>(null);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError('Invalid token.'); setLoading(false); return; }
    fetch(`${API}/subscribe/confirm?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((r) => {
        if (r.data?.blog) setBlog(r.data.blog);
        else setError(r.error?.message ?? 'Invalid or expired token.');
      })
      .catch(() => setError('Something went wrong.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (blog) {
      const t = setTimeout(() => {
        window.location.href = `https://${blog.slug}.${(process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000').split(':')[0]}`;
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [blog]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)', fontFamily: 'var(--font-ui)' }}>
      <div style={{ textAlign: 'center', maxWidth: '320px', padding: '0 24px' }}>
        {loading ? (
          <p style={{ color: 'var(--color-muted)' }}>Confirming…</p>
        ) : error ? (
          <>
            <p style={{ fontSize: '18px', color: 'var(--color-ink)', marginBottom: '8px' }}>Something went wrong.</p>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>{error}</p>
          </>
        ) : blog ? (
          <>
            <p style={{ fontSize: '36px', marginBottom: '16px' }}>✓</p>
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>You're subscribed</h1>
            <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '24px' }}>to {blog.title}</p>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '20px' }}>You'll get new posts by email.</p>
            <a
              href={`https://${blog.slug}.${(process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000').split(':')[0]}`}
              style={{ color: 'var(--color-accent)', fontSize: '14px' }}
            >
              Read the blog →
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><ConfirmContent /></Suspense>;
}
