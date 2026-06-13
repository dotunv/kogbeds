'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import type { Post } from '@/lib/types';
import { slugify } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

type Props = {
  post: Post | null;
  pubSlug?: string;
  onClose: () => void;
  onUpdate: (p: Post) => void;
};

type ScheduleMode = 'now' | 'later';

function CharCounter({ value, max }: { value: string; max: number }) {
  const len  = value.length;
  const pct  = len / max;
  const color = pct >= 1 ? 'var(--color-danger)' : pct >= 0.8 ? '#b45309' : 'var(--color-muted)';
  return <span style={{ fontSize: '11px', color }}>{len}/{max}</span>;
}

export function PostSettingsPanel({ post, pubSlug, onClose, onUpdate }: Props) {
  const [slug, setSlug]             = useState(post?.slug ?? slugify(post?.title ?? ''));
  const [excerpt, setExcerpt]       = useState(post?.excerpt ?? '');
  const [tagInput, setTagInput]     = useState('');
  const [tags, setTags]             = useState(post?.tags.map((t) => t.name) ?? []);
  const [metaTitle, setMetaTitle]   = useState(post?.metaTitle ?? '');
  const [metaDesc, setMetaDesc]     = useState(post?.metaDescription ?? '');
  const [ogImage, setOgImage]       = useState(post?.ogImageUrl ?? '');
  const [schedMode, setSchedMode]   = useState<ScheduleMode>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving]         = useState(false);

  const tk = () => localStorage.getItem('access_token') ?? '';

  function addTag() {
    const t = tagInput.trim().toLowerCase().slice(0, 50);
    if (t && !tags.includes(t) && tags.length < 30) {
      setTags([...tags, t]);
      setTagInput('');
    }
  }

  async function save() {
    if (!post) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      slug: slugify(slug),
      excerpt,
      tags,
      metaTitle,
      metaDescription: metaDesc,
    };
    if (ogImage) body['ogImageUrl'] = ogImage;
    const res = await fetch(`${API}/publications/${pubSlug}/posts/${post.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    onUpdate(res.data);
    setSaving(false);
    onClose();
  }

  async function schedule() {
    if (!post || !scheduledAt) return;
    setSaving(true);
    await fetch(`${API}/publications/${pubSlug}/posts/${post.slug}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() }),
    });
    setSaving(false);
    onClose();
  }

  async function deletePost() {
    if (!post) return;
    if (!confirm('Delete this post? This cannot be undone.')) return;
    await fetch(`${API}/publications/${pubSlug}/posts/${post.slug}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tk()}` },
    });
    window.location.href = `/dashboard/publications/${pubSlug}`;
  }

  const slugPreview = pubSlug ? `${pubSlug}.${ROOT_DOMAIN.split(':')[0]}/${slug || slugify(post?.title ?? '')}` : (slug || '');

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} onClick={onClose} />

      {/* Panel */}
      <aside
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '340px',
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

        {!post && (
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', background: 'var(--color-canvas)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
            Save your post first to edit settings.
          </p>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

        {/* Slug */}
        <Field label="Slug">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={inputSty}
          />
          <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px', wordBreak: 'break-all' }}>
            {slugPreview}
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
              maxLength={50}
              style={{ ...inputSty, flex: 1 }}
            />
            <Button size="sm" variant="ghost" onClick={addTag}>Add</Button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>{tags.length}/30 tags</p>
        </Field>

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

        {/* SEO */}
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>SEO</p>

        <Field label={<span style={{ display: 'flex', justifyContent: 'space-between' }}>Meta title <CharCounter value={metaTitle} max={60} /></span>}>
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            maxLength={60}
            placeholder="Defaults to post title"
            style={inputSty}
          />
        </Field>

        <Field label={<span style={{ display: 'flex', justifyContent: 'space-between' }}>Meta description <CharCounter value={metaDesc} max={160} /></span>}>
          <textarea
            value={metaDesc}
            onChange={(e) => setMetaDesc(e.target.value)}
            maxLength={160}
            rows={3}
            placeholder="Defaults to excerpt"
            style={{ ...inputSty, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
          />
        </Field>

        <Field label="OG image URL">
          <input
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            placeholder="https://…"
            style={inputSty}
          />
        </Field>

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

        {/* Scheduling */}
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Publish</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(['now', 'later'] as ScheduleMode[]).map((m) => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-ink)', cursor: 'pointer' }}>
              <input type="radio" checked={schedMode === m} onChange={() => setSchedMode(m)} />
              {m === 'now' ? 'Publish now' : 'Schedule for later'}
            </label>
          ))}
        </div>

        {schedMode === 'later' && (
          <div>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
              style={inputSty}
            />
            <Button
              style={{ marginTop: '8px', width: '100%' }}
              variant="ghost"
              loading={saving}
              onClick={schedule}
              disabled={!post || !scheduledAt}
            >
              Schedule post
            </Button>
          </div>
        )}

        {/* Save */}
        {schedMode === 'now' && (
          <Button loading={saving} onClick={save} disabled={!post}>Save settings</Button>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

        {/* Danger zone */}
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Danger zone</p>
          <Button variant="danger" onClick={deletePost} disabled={!post}>Delete post</Button>
        </div>
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string | React.ReactNode; children: React.ReactNode }) {
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
  boxSizing: 'border-box',
};
