'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function ConfirmContent() {
  const params = useSearchParams();
  const token  = params.get('token') ?? '';
  const [publication, setPublication] = useState<{ title: string; slug: string } | null>(null);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(true);

  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  const rootHost = ROOT_DOMAIN.split(':')[0];

  useEffect(() => {
    if (!token) { setError('Invalid token.'); setLoading(false); return; }
    fetch(`${API}/subscribe/confirm?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((r) => {
        if (r.data?.publication) setPublication(r.data.publication);
        else if (r.data?.blog) setPublication({ title: r.data.blog.title, slug: r.data.blog.username });
        else setError(r.error?.message ?? 'Invalid or expired token.');
      })
      .catch(() => setError('Something went wrong.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (publication) {
      const t = setTimeout(() => {
        const host = rootHost === 'localhost' ? `http://${publication.slug}.localhost${ROOT_DOMAIN.includes(':') ? `:${ROOT_DOMAIN.split(':')[1]}` : ''}` : `https://${publication.slug}.${rootHost}`;
        window.location.href = host;
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [publication, rootHost, ROOT_DOMAIN]);

  const pubUrl = publication
    ? rootHost === 'localhost'
      ? `http://${publication.slug}.localhost${ROOT_DOMAIN.includes(':') ? `:${ROOT_DOMAIN.split(':')[1]}` : ''}`
      : `https://${publication.slug}.${rootHost}`
    : '#';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)', fontFamily: 'var(--font-ui)' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px', padding: '0 24px' }}>
        {loading ? (
          <p style={{ color: 'var(--color-muted)' }}>Confirming…</p>
        ) : error ? (
          <>
            <p style={{ fontSize: '18px', color: 'var(--color-ink)', marginBottom: '8px' }}>Something went wrong.</p>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>{error}</p>
          </>
        ) : publication ? (
          <>
            <p style={{ fontSize: '40px', marginBottom: '16px' }}>✓</p>
            <h1 style={{ fontFamily: 'var(--font-reading)', fontSize: '24px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px', lineHeight: 1.2 }}>
              You&apos;re subscribed to {publication.title}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '28px' }}>
              You&apos;ll receive new posts by email. You can unsubscribe anytime.
            </p>
            <a
              href={pubUrl}
              style={{ color: 'var(--color-accent)', fontSize: '15px', textDecoration: 'none', fontWeight: 500 }}
            >
              Read the publication →
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
