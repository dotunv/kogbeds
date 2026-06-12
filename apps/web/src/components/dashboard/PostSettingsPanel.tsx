'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import type { Post } from '@/lib/types';
import { slugify } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

type Props = { post: Post; onClose: () => void; onUpdate: (p: Post) => void };

export function PostSettingsPanel({ post, onClose, onUpdate }: Props) {
  const [slug, setSlug]     = useState(post.slug);
  const [excerpt, setExcerpt] = useState(post.excerpt ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags]     = useState(post.tags.map((t) => t.name));
  const [metaTitle, setMetaTitle]   = useState(post.metaTitle ?? '');
  const [metaDesc, setMetaDesc]     = useState(post.metaDescription ?? '');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>(post.scheduledAt ? 'later' : 'now');
  const [scheduledAt, setScheduledAt] = useState(post.scheduledAt ? post.scheduledAt.slice(0, 16) : '');
  const [saving, setSaving] = useState(false);

  const token = () => localStorage.getItem('access_token') ?? '';

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 30) {
      setTags([...tags, t]);
      setTagInput('');
    }
  }

  async function save() {
    setSaving(true);
    const body: Record<string, unknown> = {
      slug: slugify(slug),
      excerpt,
      tags,
      metaTitle,
      metaDescription: metaDesc,
    };
    const res = await fetch(`${API}/posts/${post.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    onUpdate(res.data);

    if (scheduleMode === 'later' && scheduledAt) {
      await fetch(`${API}/posts/${post.slug}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() }),
      });
    }
    setSaving(false);
    onClose();
  }

  async function deletePost() {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    await fetch(`${API}/posts/${post.slug}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    window.location.href = '/dashboard';
  }

  const metaTitlePct  = (metaTitle.length / 60) * 100;
  const metaDescPct   = (metaDesc.length / 160) * 100;
  const username      = typeof window !== 'undefined' ? localStorage.getItem('grizzly_username') ?? '' : '';

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '320px',
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          zIndex: 50,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>Post settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

        {/* Slug */}
        <Field label="Slug">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={inputSty}
          />
          <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
            {username ? `${username}.${ROOT_DOMAIN.split(':')[0]}/${slug}` : slug}
          </p>
        </Field>

        {/* Excerpt */}
        <Field label="Excerpt">
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            maxLength={500}
            rows={3}
            style={{ ...inputSty, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
          />
        </Field>

        {/* Tags */}
        <Field label="Tags">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {tags.map((t) => (
              <Tag key={t} label={t} onRemove={() => setTags(tags.filter((x) => x !== t))} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Add tag…"
              style={{ ...inputSty, flex: 1 }}
            />
            <Button size="sm" variant="ghost" onClick={addTag}>Add</Button>
          </div>
        </Field>

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

        {/* SEO */}
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SEO</p>

        <Field label={`Meta title (${metaTitle.length}/60)`}>
          <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={60} style={{ ...inputSty, borderColor: metaTitlePct > 100 ? 'var(--color-danger)' : metaTitlePct > 80 ? 'var(--color-warning)' : undefined }} />
        </Field>

        <Field label={`Meta description (${metaDesc.length}/160)`}>
          <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} maxLength={160} rows={3} style={{ ...inputSty, height: 'auto', padding: '8px 10px', resize: 'vertical', borderColor: metaDescPct > 100 ? 'var(--color-danger)' : metaDescPct > 80 ? 'var(--color-warning)' : undefined }} />
        </Field>

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

        {/* Schedule */}
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(['now', 'later'] as const).map((m) => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-ink)', cursor: 'pointer' }}>
              <input type="radio" checked={scheduleMode === m} onChange={() => setScheduleMode(m)} />
              {m === 'now' ? 'Publish now' : 'Schedule for later'}
            </label>
          ))}
          {scheduleMode === 'later' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
              style={inputSty}
            />
          )}
        </div>

        {/* Save */}
        <Button loading={saving} onClick={save}>Save settings</Button>

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

        {/* Danger zone */}
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Danger zone</p>
          <Button variant="danger" onClick={deletePost}>Delete post</Button>
        </div>
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  );
}

const inputSty: React.CSSProperties = {
  width: '100%',
  height: '34px',
  padding: '0 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-ui)',
  fontSize: '13px',
  color: 'var(--color-ink)',
  background: 'var(--color-surface)',
  outline: 'none',
};
