'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Settings as SettingsIcon, GripVertical, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PostSettingsPanel } from './PostSettingsPanel';
import type { Post } from '@/lib/types';
import { slugify } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Format = 'MARKDOWN' | 'BLOCKS';
type Props  = { postId: string | null };

// ─── Block types ─────────────────────────────────────────────────────────────
type BlockType = 'PARAGRAPH' | 'HEADING_1' | 'HEADING_2' | 'HEADING_3' | 'BLOCKQUOTE' | 'CODE' | 'ORDERED_LIST' | 'UNORDERED_LIST' | 'DIVIDER' | 'IMAGE';
// Internal editor representation — always a flat { id, type, content }
// LIST content is newline-separated items; IMAGE content is the URL; DIVIDER content is ignored
type Block = { id: string; type: BlockType; content: string };

// API uses lowercase types with different field names — map to/from internal Block
function serializeBlock(b: Block): Record<string, unknown> {
  switch (b.type) {
    case 'PARAGRAPH':   return { type: 'paragraph', text: b.content };
    case 'HEADING_1':   return { type: 'heading', level: 1, text: b.content };
    case 'HEADING_2':   return { type: 'heading', level: 2, text: b.content };
    case 'HEADING_3':   return { type: 'heading', level: 3, text: b.content };
    case 'BLOCKQUOTE':  return { type: 'blockquote', text: b.content };
    case 'CODE':        return { type: 'code', code: b.content };
    case 'ORDERED_LIST': {
      const items = b.content.split('\n').map((s) => s.trim()).filter(Boolean);
      return { type: 'list', ordered: true, items: items.length > 0 ? items : [''] };
    }
    case 'UNORDERED_LIST': {
      const items = b.content.split('\n').map((s) => s.trim()).filter(Boolean);
      return { type: 'list', ordered: false, items: items.length > 0 ? items : [''] };
    }
    case 'IMAGE':       return { type: 'image', url: b.content };
    case 'DIVIDER':     return { type: 'divider' };
  }
}

type RawApiBlock = Record<string, unknown>;
function deserializeBlock(raw: RawApiBlock): Block {
  const t = raw['type'] as string;
  const id = crypto.randomUUID();
  if (t === 'divider') return { id, type: 'DIVIDER', content: '' };
  if (t === 'heading') {
    const level = raw['level'] as number;
    const type = level === 1 ? 'HEADING_1' : level === 2 ? 'HEADING_2' : 'HEADING_3';
    return { id, type, content: (raw['text'] as string) ?? '' };
  }
  if (t === 'list') {
    const items = (raw['items'] as string[] | undefined) ?? [];
    const type = raw['ordered'] ? 'ORDERED_LIST' : 'UNORDERED_LIST';
    return { id, type, content: items.join('\n') };
  }
  if (t === 'image')      return { id, type: 'IMAGE',      content: (raw['url']  as string) ?? '' };
  if (t === 'code')       return { id, type: 'CODE',       content: (raw['code'] as string) ?? '' };
  if (t === 'blockquote') return { id, type: 'BLOCKQUOTE', content: (raw['text'] as string) ?? '' };
  // paragraph (default)
  return { id, type: 'PARAGRAPH', content: (raw['text'] as string) ?? '' };
}

const BLOCK_MENU: { type: BlockType; label: string; icon: string; desc: string }[] = [
  { type: 'PARAGRAPH',      icon: '¶',  label: 'Paragraph',      desc: 'Plain text' },
  { type: 'HEADING_1',      icon: 'H1', label: 'Heading 1',      desc: 'Large heading' },
  { type: 'HEADING_2',      icon: 'H2', label: 'Heading 2',      desc: 'Medium heading' },
  { type: 'HEADING_3',      icon: 'H3', label: 'Heading 3',      desc: 'Small heading' },
  { type: 'BLOCKQUOTE',     icon: '"',  label: 'Blockquote',     desc: 'Indented quote' },
  { type: 'CODE',           icon: '<>', label: 'Code',           desc: 'Monospace block' },
  { type: 'ORDERED_LIST',   icon: '1.', label: 'Ordered list',   desc: 'Numbered items' },
  { type: 'UNORDERED_LIST', icon: '•',  label: 'Bullet list',    desc: 'Unordered items' },
  { type: 'IMAGE',          icon: '🖼', label: 'Image URL',      desc: 'Paste image URL' },
  { type: 'DIVIDER',        icon: '─',  label: 'Divider',        desc: 'Horizontal rule' },
];

// ─── EditorPage ───────────────────────────────────────────────────────────────
export function EditorPage({ postId }: Props) {
  const router = useRouter();
  const [post, setPost]           = useState<Post | null>(null);
  const [format, setFormat]       = useState<Format | null>(null);
  const [title, setTitle]         = useState('');
  const [content, setContent]     = useState('');
  const [blocks, setBlocks]       = useState<Block[]>([]);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Use refs to avoid stale closures in the debounce callback
  const postRef    = useRef<Post | null>(null);
  const formatRef  = useRef<Format | null>(null);
  const titleRef   = useRef('');
  const contentRef = useRef('');
  const blocksRef  = useRef<Block[]>([]);
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  postRef.current    = post;
  formatRef.current  = format;
  titleRef.current   = title;
  contentRef.current = content;
  blocksRef.current  = blocks;

  function token() { return localStorage.getItem('access_token') ?? ''; }

  // Load existing post
  useEffect(() => {
    if (!postId) return;
    fetch(`${API}/posts/${postId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => { if (r.status === 401) { window.location.href = '/login'; throw new Error(); } return r.json(); })
      .then((r) => {
        const p: Post = r.data;
        // API has no format field — derive it from which content field is present
        const fmt: Format = Array.isArray(p.blocks) && (p.blocks as unknown[]).length > 0 ? 'BLOCKS' : 'MARKDOWN';
        setPost(p);
        setFormat(fmt);
        setTitle(p.title);
        setContent(p.contentMarkdown ?? '');
        if (fmt === 'BLOCKS') {
          setBlocks((p.blocks as Record<string, unknown>[]).map(deserializeBlock));
        }
      })
      .catch(() => {});
  }, [postId]);

  // Auto-save debounce: 2.5s after last keystroke
  useEffect(() => {
    if (!format) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void debouncedSave(), 2500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, blocks, format]);

  async function debouncedSave() {
    const fmt    = formatRef.current;
    const p      = postRef.current;
    const hasTitle   = titleRef.current.trim().length > 0;
    const hasContent = contentRef.current.trim().length > 0;
    const hasBlocks  = blocksRef.current.length > 0;
    if (!fmt) return;
    // For BLOCKS format, don't save until the user has added at least one block
    if (fmt === 'BLOCKS' && !hasBlocks) return;
    // For MARKDOWN, require at least a title or content
    if (fmt === 'MARKDOWN' && !hasTitle && !hasContent) return;
    if (!p) {
      await createPost(fmt, { silent: true });
    } else {
      await patchPost(p, fmt);
    }
  }

  async function patchPost(p: Post, fmt: Format) {
    setSaving(true);
    const body: Record<string, unknown> = { title: titleRef.current };
    if (fmt === 'MARKDOWN') {
      body.contentMarkdown = contentRef.current;
    } else if (blocksRef.current.length > 0) {
      body.blocks = blocksRef.current.map(serializeBlock);
    }
    const r = await fetch(`${API}/posts/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.status === 401) { setAuthError(true); return; }
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  async function createPost(fmt: Format, opts: { silent?: boolean } = {}): Promise<Post | null> {
    const t        = titleRef.current.trim() || 'Untitled';
    const baseSlug = slugify(t);
    const content: Record<string, unknown> = {};
    if (fmt === 'MARKDOWN') {
      content.contentMarkdown = contentRef.current || '';
    } else {
      content.blocks = blocksRef.current.map(serializeBlock);
    }

    if (!opts.silent) setSaving(true);

    // Retry with a unique suffix if the slug is already taken (409)
    let slug = baseSlug;
    let r: Response | null = null;
    let res: Record<string, unknown> = {};
    for (let attempt = 0; attempt < 3; attempt++) {
      r = await fetch(`${API}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ title: t, slug, ...content }),
      });
      if (r.status === 401) { setAuthError(true); return null; }
      res = (await r.json()) as Record<string, unknown>;
      if (r.status !== 409) break;
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    if (!opts.silent) setSaving(false);
    if (!r!.ok) throw new Error((res?.['message'] as string | undefined) ?? `Create failed (${r!.status})`);
    const created: Post = res['data'] as Post;
    setPost(created);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    window.history.replaceState(null, '', `/dashboard/editor/${created.slug}`);
    return created;
  }

  function openSettings() {
    setSettingsOpen(true);
  }

  async function publish() {
    setPublishing(true);
    try {
      let p = post;
      if (!p) { p = await createPost(format ?? 'MARKDOWN'); }
      else { await patchPost(p, format ?? 'MARKDOWN'); }
      if (!p) return;
      const pr = await fetch(`${API}/posts/${p.id}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!pr.ok) {
        const pe = await pr.json();
        throw new Error(pe?.message ?? pe?.error?.message ?? `Publish failed (${pr.status})`);
      }
      setPost((prev) => prev ? { ...prev, isPublished: true, publishedAt: new Date().toISOString() } : prev);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPublishing(false);
    }
  }

  // ── Format chooser ────────────────────────────────────────────────────────
  if (!postId && !format) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)', fontFamily: 'var(--font-ui)', gap: '28px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            Choose your writing format
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: 0 }}>
            You can change this later.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '400px', padding: '0 24px' }}>
          {([
            { fmt: 'MARKDOWN' as Format, label: 'Markdown', sub: 'Plain text + syntax' },
            { fmt: 'BLOCKS'   as Format, label: 'Blocks',   sub: 'Visual block editor'  },
          ] as const).map(({ fmt, label, sub }) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              style={{
                padding: '18px 16px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                background: 'var(--color-surface)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ fontSize: '13.5px', fontWeight: 600, display: 'block', marginBottom: '3px', color: 'var(--color-ink)' }}>{label}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.4 }}>{sub}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const status = post?.isPublished ? 'PUBLISHED' : 'DRAFT';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-canvas)', fontFamily: 'var(--font-ui)' }}>
      {/* Top bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '52px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', padding: 0 }}>
            <ArrowLeft size={14} /> Posts
          </button>
          <StatusBadge status={status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {saving && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Saving…</span>}
          {!saving && saved && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Saved</span>}
          <Button variant="ghost" size="sm" onClick={openSettings}>
            <SettingsIcon size={14} style={{ marginRight: '6px' }} />
            Settings
          </Button>
          <Button size="sm" loading={publishing} onClick={publish}>
            {status === 'PUBLISHED' ? 'Update' : 'Publish'}
          </Button>
        </div>
      </header>

      {/* Session expired banner */}
      {authError && (
        <div style={{ background: 'var(--color-danger-light)', borderBottom: '1px solid var(--color-border)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-danger)', fontFamily: 'var(--font-ui)' }}>
          <span>Your session has expired.</span>
          <a href="/login" style={{ fontWeight: 600, color: 'var(--color-danger)', textDecoration: 'underline' }}>Log in again</a>
        </div>
      )}

      {/* Editor body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '48px 24px' }}>
        <div style={{ maxWidth: 'var(--max-content)', margin: '0 auto' }}>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your post a title"
            rows={1}
            style={{ width: '100%', fontFamily: 'var(--font-reading)', fontSize: '36px', fontWeight: 600, color: 'var(--color-ink)', background: 'transparent', border: 'none', outline: 'none', resize: 'none', lineHeight: 1.2, marginBottom: '12px', overflow: 'hidden' }}
            onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
          />
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: '32px' }} />

          {format === 'MARKDOWN' ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing… Markdown is supported."
              style={{ width: '100%', fontFamily: 'var(--font-code)', fontSize: '15px', lineHeight: 1.8, color: 'var(--color-ink)', background: 'transparent', border: 'none', outline: 'none', resize: 'none', minHeight: '60vh' }}
            />
          ) : (
            <BlockEditor blocks={blocks} onChange={setBlocks} />
          )}
        </div>
      </div>

      <KeyboardHandler
        onSave={() => post ? void patchPost(post, format ?? 'MARKDOWN') : void createPost(format ?? 'MARKDOWN')}
        onPublish={publish}
        onSettings={openSettings}
      />

      {settingsOpen && (
        <PostSettingsPanel
          post={post}
          pubSlug={(post as (Post & { publication?: { slug?: string } }) | null)?.publication?.slug}
          onClose={() => setSettingsOpen(false)}
          onUpdate={(updated) => setPost(updated)}
        />
      )}
    </div>
  );
}

// ─── Block Editor ─────────────────────────────────────────────────────────────
function BlockEditor({ blocks, onChange }: { blocks: Block[]; onChange: (b: Block[]) => void }) {
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null); // 'new' or block id

  function addBlock(type: BlockType, afterId?: string) {
    const nb: Block = { id: crypto.randomUUID(), type, content: '' };
    if (!afterId) {
      onChange([...blocks, nb]);
    } else {
      const idx = blocks.findIndex((b) => b.id === afterId);
      const next = [...blocks];
      next.splice(idx + 1, 0, nb);
      onChange(next);
    }
    setMenuOpenFor(null);
  }

  function updateBlock(id: string, content: string) {
    onChange(blocks.map((b) => b.id === id ? { ...b, content } : b));
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  return (
    <div style={{ fontFamily: 'var(--font-ui)' }}>
      {blocks.map((bl) => (
        <BlockRow
          key={bl.id}
          block={bl}
          onUpdate={(c) => updateBlock(bl.id, c)}
          onRemove={() => removeBlock(bl.id)}
          onInsertAfter={() => setMenuOpenFor(bl.id)}
          menuOpen={menuOpenFor === bl.id}
          onMenuClose={() => setMenuOpenFor(null)}
          onAddBlock={(type) => addBlock(type, bl.id)}
        />
      ))}

      {/* Bottom add button */}
      <div style={{ position: 'relative', marginTop: '24px' }}>
        <button
          onClick={() => setMenuOpenFor(menuOpenFor === 'new' ? null : 'new')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius)', padding: '10px 20px', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '14px', width: '100%', justifyContent: 'center', transition: 'border-color 150ms, color 150ms' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-muted)'; }}
        >
          <Plus size={14} /> Add block
        </button>
        {menuOpenFor === 'new' && (
          <BlockMenu onSelect={(t) => addBlock(t)} onClose={() => setMenuOpenFor(null)} />
        )}
      </div>
    </div>
  );
}

function BlockRow({ block, onUpdate, onRemove, onInsertAfter, menuOpen, onMenuClose, onAddBlock }: {
  block: Block;
  onUpdate: (c: string) => void;
  onRemove: () => void;
  onInsertAfter: () => void;
  menuOpen: boolean;
  onMenuClose: () => void;
  onAddBlock: (t: BlockType) => void;
}) {
  if (block.type === 'DIVIDER') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', position: 'relative' }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
        <button onClick={onRemove} title="Remove" style={removeBtn}><X size={12} /></button>
        <button onClick={onInsertAfter} title="Add block after" style={insertBtn}><Plus size={12} /></button>
        {menuOpen && <BlockMenu onSelect={onAddBlock} onClose={onMenuClose} />}
      </div>
    );
  }

  if (block.type === 'IMAGE') {
    return (
      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input
              type="url"
              value={block.content}
              onChange={(e) => onUpdate(e.target.value)}
              placeholder="Paste image URL (must be from /files/… on this platform)"
              style={{ width: '100%', fontFamily: 'var(--font-code)', fontSize: '13px', color: 'var(--color-muted)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '8px 10px', outline: 'none' }}
            />
            {block.content && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.content} alt="" style={{ marginTop: '8px', maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }} onError={(e) => (e.currentTarget.style.display = 'none')} onLoad={(e) => (e.currentTarget.style.display = 'block')} />
            )}
          </div>
          <button onClick={onRemove} title="Remove" style={removeBtn}><X size={12} /></button>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <button onClick={onInsertAfter} style={{ ...insertBtn, fontSize: '11px', color: 'var(--color-muted)' }}><Plus size={11} /> add block after</button>
        </div>
        {menuOpen && <BlockMenu onSelect={onAddBlock} onClose={onMenuClose} />}
      </div>
    );
  }

  if (block.type === 'ORDERED_LIST' || block.type === 'UNORDERED_LIST') {
    const bullet = block.type === 'ORDERED_LIST' ? '1.' : '•';
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '4px', position: 'relative' }}>
        <span style={{ paddingTop: '10px', color: 'var(--color-muted)', fontSize: '14px', minWidth: '20px', textAlign: 'center', flexShrink: 0 }}>{bullet}</span>
        <div style={{ flex: 1 }}>
          <textarea
            value={block.content}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder={`One item per line`}
            style={{ ...blockStyles(block.type), width: '100%' }}
            rows={2}
            onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
          />
          <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>One item per line</p>
        </div>
        <button onClick={onRemove} title="Remove" style={{ ...removeBtn, paddingTop: '6px' }}><X size={12} /></button>
        {menuOpen && <BlockMenu onSelect={onAddBlock} onClose={onMenuClose} />}
      </div>
    );
  }

  const styles = blockStyles(block.type);

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '4px', position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '6px', opacity: 0, transition: 'opacity 150ms' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0')}
        className="block-controls"
      >
        <button onClick={onInsertAfter} title="Add block after" style={insertBtn}><Plus size={11} /></button>
        <button style={{ ...removeBtn, cursor: 'grab' }} title="Drag to reorder"><GripVertical size={11} /></button>
      </div>

      <textarea
        value={block.content}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder={BLOCK_MENU.find((b) => b.type === block.type)?.label ?? ''}
        style={styles}
        rows={1}
        onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
      />

      <button onClick={onRemove} title="Remove" style={{ ...removeBtn, paddingTop: '6px' }}><X size={12} /></button>
      {menuOpen && <BlockMenu onSelect={onAddBlock} onClose={onMenuClose} />}
    </div>
  );
}

function BlockMenu({ onSelect, onClose }: { onSelect: (t: BlockType) => void; onClose: () => void }) {
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-block-menu]')) onClose();
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [onClose]);

  return (
    <div data-block-menu style={{
      position: 'absolute', top: '100%', left: 0, marginTop: '4px',
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
      zIndex: 20, minWidth: '220px', overflow: 'hidden',
    }}>
      {BLOCK_MENU.map(({ type, icon, label, desc }) => (
        <button key={type} onClick={() => onSelect(type)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-ink)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-light)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <span style={{ width: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'var(--font-code)', flexShrink: 0 }}>{icon}</span>
          <span>
            <span style={{ fontWeight: 500 }}>{label}</span>
            <span style={{ color: 'var(--color-muted)', marginLeft: '6px' }}>{desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function blockStyles(type: BlockType): React.CSSProperties {
  const base: React.CSSProperties = {
    flex: 1, outline: 'none', resize: 'none', overflow: 'hidden',
    minHeight: '36px', background: 'transparent', border: 'none',
    color: 'var(--color-ink)', lineHeight: 1.65, width: '100%',
  };
  if (type === 'HEADING_1') return { ...base, fontFamily: 'var(--font-reading)', fontSize: '30px', fontWeight: 700, lineHeight: 1.2 };
  if (type === 'HEADING_2') return { ...base, fontFamily: 'var(--font-reading)', fontSize: '22px', fontWeight: 700, lineHeight: 1.3 };
  if (type === 'HEADING_3') return { ...base, fontFamily: 'var(--font-reading)', fontSize: '18px', fontWeight: 600, lineHeight: 1.4 };
  if (type === 'BLOCKQUOTE') return { ...base, fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: '17px', borderLeft: '3px solid var(--color-border)', paddingLeft: '16px', color: 'var(--color-muted)' };
  if (type === 'CODE') return { ...base, fontFamily: 'var(--font-code)', fontSize: '13px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '12px 14px', lineHeight: 1.7 };
  if (type === 'ORDERED_LIST') return { ...base, fontFamily: 'var(--font-reading)', fontSize: '16px', paddingLeft: '4px' };
  if (type === 'UNORDERED_LIST') return { ...base, fontFamily: 'var(--font-reading)', fontSize: '16px', paddingLeft: '4px' };
  if (type === 'IMAGE') return { ...base, fontFamily: 'var(--font-code)', fontSize: '13px', color: 'var(--color-muted)' };
  return { ...base, fontFamily: 'var(--font-reading)', fontSize: '17px' };
}

const removeBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', padding: '2px', borderRadius: '4px', opacity: 0.5 };
const insertBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', padding: '2px', borderRadius: '4px' };

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
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
