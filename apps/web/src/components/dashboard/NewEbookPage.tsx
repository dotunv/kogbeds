'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const token = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : '');

export function NewEbookPage() {
  const router = useRouter();
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function create() {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    const res = await fetch(`${API}/ebooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
    }).then((r) => r.json());
    if (res.error) {
      setError(res.error.message ?? 'Failed to create ebook.');
      setSaving(false);
    } else {
      router.push(`/dashboard/ebooks/${res.data.id}`);
    }
  }

  return (
    <div style={{ fontFamily: 'var(--font-ui)', maxWidth: '480px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '24px' }}>New ebook</h1>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: '24px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label style={labelSty}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Building in Public"
            maxLength={200}
            style={inputSty}
            autoFocus
          />
        </div>

        <div>
          <label style={labelSty}>Description <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(shown on ebook cover)</span></label>
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What I learned shipping alone for 6 months…"
            maxLength={1000}
            rows={4}
            style={{ ...inputSty, height: 'auto', padding: '10px 12px', resize: 'vertical' }}
          />
        </div>

        {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)', margin: 0 }}>{error}</p>}

        <div>
          <Button onClick={create} loading={saving} disabled={!title.trim()}>
            Create ebook →
          </Button>
        </div>
      </div>
    </div>
  );
}

const labelSty: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 500,
  color: 'var(--color-ink)', marginBottom: '6px',
};

const inputSty: React.CSSProperties = {
  width: '100%', height: '38px', padding: '0 12px',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--color-ink)',
  background: 'var(--color-surface)', outline: 'none', boxSizing: 'border-box',
};
