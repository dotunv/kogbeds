'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PostSettingsPanel } from './PostSettingsPanel';
import type { Post } from '@/lib/types';
import { slugify } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Format = 'MARKDOWN' | 'BLOCKS';
type Props  = { postId: string | null };

export function EditorPage({ postId }: Props) {
  const [post, setPost]           = useState<Post | null>(null);
  const [format, setFormat]       = useState<Format | null>(postId ? null : null);
  const [title, setTitle]         = useState('');
  const [content, setContent]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function token() { return localStorage.getItem('access_token') ?? ''; }

  useEffect(() => {
    if (!postId) return;
    fetch(`${API}/posts/${postId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((r) => {
        const p: Post = r.data;
        setPost(p);
        setFormat(p.format);
        setTitle(p.title);
        setContent(p.markdownContent ?? '');
      });
  }, [postId]);

  useEffect(() => {
    if (!format || !postId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autosave(), 30_000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [title, content]);

  async function autosave() {
    if (!postId || !format) return;
    setSaving(true);
    const body: Record<string, unknown> = { title, format };
    if (format === 'MARKDOWN') body.markdownContent = content;
    await fetch(`${API}/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function createPost(fmt: Format) {
    const slug = slugify(title || 'untitled');
    const body: Record<string, unknown> = { title: title || 'Untitled', slug, format: fmt };
    if (fmt === 'MARKDOWN') body.markdownContent = content || '';
    else body.blocks = [];
    const res = await fetch(`${API}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    const created: Post = res.data;
    setPost(created);
    setFormat(fmt);
    window.history.replaceState(null, '', `/dashboard/editor/${created.id}`);
    return created;
  }

  async function publish() {
    setPublishing(true);
    try {
      let p = post;
      if (!p) { p = await createPost(format ?? 'MARKDOWN'); }
      else { await autosave(); }
      await fetch(`${API}/posts/${p.slug}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      setPost((prev) => prev ? { ...prev, status: 'PUBLISHED' } : prev);
    } finally {
      setPublishing(false);
    }
  }

  // ── Format chooser (new post, no format chosen) ──────────────────────────────
  if (!postId && !format) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)', fontFamily: 'var(--font-ui)' }}>
        <div style={{ maxWidth: '560px', width: '100%', padding: '0 24px' }}>
          <p style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '24px', textAlign: 'center' }}>
            How would you like to write this post?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {([
              { fmt: 'MARKDOWN' as Format, icon: '#', title: 'Markdown', desc: 'Plain text with Markdown syntax' },
              { fmt: 'BLOCKS' as Format, icon: '⊞', title: 'Blocks', desc: 'Click to add paragraphs, images, embeds' },
            ] as const).map(({ fmt, icon, title: t, desc }) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                style={{
                  padding: '24px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>{icon}</span>
                <span style={{ fontSize: '15px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--color-ink)' }}>{t}</span>
                <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const status = post?.status ?? 'DRAFT';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-canvas)', fontFamily: 'var(--font-ui)' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: '52px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/dashboard" style={{ color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Posts
          </Link>
          <StatusBadge status={status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {saved && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Saved</span>}
          {saving && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Saving…</span>}
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon size={14} style={{ marginRight: '6px' }} />
            Settings
          </Button>
          <Button size="sm" loading={publishing} onClick={publish}>
            {status === 'PUBLISHED' ? 'Update' : 'Publish'}
          </Button>
        </div>
      </header>

      {/* Editor body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '48px 24px' }}>
        <div style={{ maxWidth: 'var(--max-content)', margin: '0 auto' }}>
          {/* Title */}
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your post a title"
            rows={1}
            style={{
              width: '100%',
              fontFamily: 'var(--font-reading)',
              fontSize: '36px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.2,
              marginBottom: '12px',
              overflow: 'hidden',
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: '32px' }} />

          {/* Body */}
          {format === 'MARKDOWN' ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing, or paste your draft here. Markdown is supported."
              style={{
                width: '100%',
                fontFamily: 'var(--font-code)',
                fontSize: '15px',
                lineHeight: 1.8,
                color: 'var(--color-ink)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                minHeight: '60vh',
              }}
            />
          ) : (
            <BlockEditor />
          )}
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <KeyboardHandler onSave={autosave} onPublish={publish} onSettings={() => setSettingsOpen(true)} />

      {/* Post settings panel */}
      {settingsOpen && post && (
        <PostSettingsPanel
          post={post}
          onClose={() => setSettingsOpen(false)}
          onUpdate={(updated) => setPost(updated)}
        />
      )}
    </div>
  );
}

function BlockEditor() {
  return (
    <div style={{ color: 'var(--color-muted)', fontSize: '15px', fontFamily: 'var(--font-ui)' }}>
      <p>Click + to add your first block</p>
      {/* Full block editor implementation would go here */}
    </div>
  );
}

function KeyboardHandler({ onSave, onPublish, onSettings }: { onSave: () => void; onPublish: () => void; onSettings: () => void }) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); onSave(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onPublish(); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') { e.preventDefault(); onSettings(); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave, onPublish, onSettings]);
  return null;
}
