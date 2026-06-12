'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function UnsubscribeContent() {
  const params = useSearchParams();
  const token  = params.get('token') ?? '';
  const [blog, setBlog]   = useState<{ title: string; slug: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError('Invalid token.'); setLoading(false); return; }
    fetch(`${API}/subscribe/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((r) => {
        if (r.data?.blog) setBlog(r.data.blog);
        else setError(r.error?.message ?? 'Invalid or expired token.');
      })
      .catch(() => setError('Something went wrong.'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)', fontFamily: 'var(--font-ui)' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px', padding: '0 24px' }}>
        {loading ? (
          <p style={{ color: 'var(--color-muted)' }}>Processing…</p>
        ) : error ? (
          <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>{error}</p>
        ) : blog ? (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '12px' }}>You've unsubscribed</h1>
            <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '8px' }}>from {blog.title}</p>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px' }}>You won't receive any more emails from this blog.</p>
            <a
              href={`https://${blog.slug}.${(process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000').split(':')[0]}`}
              style={{ fontSize: '13px', color: 'var(--color-muted)', textDecoration: 'underline' }}
            >
              Changed your mind? Subscribe again
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><UnsubscribeContent /></Suspense>;
}
