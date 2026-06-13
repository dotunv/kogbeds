'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Ebook } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const token = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : '');

function StatusBadge({ status }: { status: string }) {
  const published = status === 'PUBLISHED';
  return (
    <span style={{
      fontSize: '11px', fontWeight: 500,
      color: published ? '#16a34a' : '#6B6B68',
      background: published ? '#f0fdf4' : '#F7F7F5',
      borderRadius: '3px', padding: '2px 7px',
    }}>
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

export function EbookListPage() {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/ebooks`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((res) => setEbooks(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ fontFamily: 'var(--font-ui)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>Ebooks</h1>
        <Link href="/dashboard/ebooks/new">
          <Button size="sm">
            <Plus size={14} style={{ marginRight: '6px' }} />
            New ebook
          </Button>
        </Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading…</p>
      ) : ebooks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-muted)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius)' }}>
          <p style={{ marginBottom: '16px', fontSize: '14px' }}>No ebooks yet. Start writing one.</p>
          <Link href="/dashboard/ebooks/new"><Button size="sm">New ebook</Button></Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ebooks.map((book, i) => (
            <Link
              key={book.id}
              href={`/dashboard/ebooks/${book.id}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 0', textDecoration: 'none',
                borderTop: i === 0 ? '1px solid var(--color-border)' : undefined,
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-ink)' }}>{book.title}</span>
                <StatusBadge status={book.status} />
                <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                  {book._count?.chapters ?? book.chapters?.length ?? 0} chapters
                </span>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--color-muted)' }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
