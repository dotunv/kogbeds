'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Settings as SettingsIcon, GripVertical, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PostSettingsPanel } from './PostSettingsPanel';
import type { Post } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Format = 'MARKDOWN' | 'BLOCKS';
type Props = { postId: string | null; publicationSlug: string };

// ─── Block types ─────────────────────────────────────────────────────────────
type BlockType = 'PARAGRAPH' | 'HEADING_1' | 'HEADING_2' | 'HEADING_3' | 'BLOCKQUOTE' | 'CODE' | 'ORDERED_LIST' | 'UNORDERED_LIST' | 'DIVIDER' | 'IMAGE';
// Internal editor representation — always a flat { id, type, content }
// LIST content is newline-separated items; IMAGE content is the URL; DIVIDER content is ignored
type Block = { id: string; type: BlockType; content: string };

// API uses lowercase types with different field names — map to/from internal Block
function serializeBlock(b: Block): Record<string, unknown> {
  if (b.type === 'DIVIDER') return { type: b.type };
  if (b.type === 'IMAGE') return { type: b.type, url: b.content };
  if (b.type === 'ORDERED_LIST' || b.type === 'UNORDERED_LIST') {
    return { type: b.type, items: b.content.split('\n').map((item) => item.trim()).filter(Boolean) };
  }
  return { type: b.type, content: b.content };
}

type RawApiBlock = Record<string, unknown>;
function deserializeBlock(raw: RawApiBlock): Block {
  const type = raw.type as BlockType;
  const content = type === 'IMAGE' ? raw.url : type === 'ORDERED_LIST' || type === 'UNORDERED_LIST'
    ? ((raw.items as string[] | undefined) ?? []).join('\n') : raw.content;
  return { id: crypto.randomUUID(), type, content: (content as string | undefined) ?? '' };
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
export function EditorPage({ postId, publicationSlug }: Props) {
  const router = useRouter();
  const [post, setPost]           = useState<Post | null>(null);
  const [format, setFormat]       = useState<Format | null>(postId ? null : 'MARKDOWN');
  const [title, setTitle]         = useState('');
  const [content, setContent]     = useState('');
  const [blocks, setBlocks]       = useState<Block[]>([]);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [dirty, setDirty] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const pendingSave = useRef<Promise<Post | null>>(Promise.resolve(null));
  const editVersion = useRef(0);
  const persistedVersion = useRef(0);
  const base = `${API}/publications/${encodeURIComponent(publicationSlug)}/posts`;

  // Use refs to avoid stale closures in the debounce callback
  const postRef    = useRef<Post | null>(null);
  const formatRef  = useRef<Format | null>(null);
  const titleRef   = useRef('');
  const contentRef = useRef('');
  const blocksRef  = useRef<Block[]>([]);
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    postRef.current = post;
    formatRef.current = format;
    titleRef.current = title;
    contentRef.current = content;
    blocksRef.current = blocks;
  }, [post, format, title, content, blocks]);

  function token() { return localStorage.getItem('access_token') ?? ''; }

  // Load existing post
  useEffect(() => {
    if (!postId || !publicationSlug) return;
    fetch(`${base}/${encodeURIComponent(postId)}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => { if (r.status === 401) { window.location.href = '/login'; throw new Error(); } if (!r.ok) throw new Error('Could not load this post.'); return r.json(); })
      .then((r) => {
        const p: Post = r.data;
        // API has no format field — derive it from which content field is present
        const fmt: Format = p.format;
        setPost(p);
        setFormat(fmt);
        setTitle(p.title);
        setContent(p.markdownContent ?? '');
        if (fmt === 'BLOCKS') {
          setBlocks((p.blocks as Record<string, unknown>[]).map(deserializeBlock));
        }
      })
      .catch(() => setLoadError('Could not load this post. Return to your publication and try again.'));
  }, [postId, base, publicationSlug]);

  // Auto-save debounce: 2.5s after last keystroke
  useEffect(() => {
    if (!format || editVersion.current === persistedVersion.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void debouncedSave(), 2500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [title, content, blocks, format]);

  async function savePost(): Promise<Post | null> {
    const fmt = formatRef.current;
    const version = editVersion.current;
    const snapshot = { title: titleRef.current.trim(), content: contentRef.current, blocks: [...blocksRef.current] };
    if (!fmt || !publicationSlug) throw new Error('Choose a publication before writing.');
    if (!snapshot.title || (fmt === 'MARKDOWN' && !snapshot.content.trim()) || (fmt === 'BLOCKS' && !snapshot.blocks.length)) {
      throw new Error('Add a title and some content to save your draft.');
    }
    const previous = postRef.current;
    const body = fmt === 'MARKDOWN'
      ? { title: snapshot.title, markdownContent: snapshot.content }
      : { title: snapshot.title, blocks: snapshot.blocks.map(serializeBlock) };
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(previous ? `${base}/${encodeURIComponent(previous.slug)}` : base, {
        method: previous ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(previous ? body : { ...body, format: fmt }),
      });
      if (response.status === 401) setAuthError(true);
      if (!response.ok) throw new Error('Could not save your draft. Your changes are still in the editor; please try again.');
      const result = await response.json();
      const savedPost: Post = result.data;
      postRef.current = savedPost;
      if (mountedRef.current) {
        setPost(savedPost);
        persistedVersion.current = version;
        setSaved(editVersion.current === version);
        setDirty(editVersion.current !== version);
        if (!previous) window.history.replaceState(null, '', `/dashboard/editor/${encodeURIComponent(savedPost.slug)}?publication=${encodeURIComponent(publicationSlug)}`);
      }
      return savedPost;
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  function queueSave(): Promise<Post | null> {
    const task = pendingSave.current.catch(() => null).then(() => savePost());
    pendingSave.current = task;
    return task.catch((error: unknown) => {
      if (mountedRef.current) setSaveError(error instanceof Error ? error.message : 'Could not save your draft.');
      throw error;
    });
  }

  async function debouncedSave() {
    if (!titleRef.current.trim() || (formatRef.current === 'MARKDOWN' && !contentRef.current.trim()) || (formatRef.current === 'BLOCKS' && !blocksRef.current.length)) return;
    try { await queueSave(); } catch { /* error shown in the editor */ }
  }

  function markChanged() { editVersion.current += 1; setDirty(true); setSaved(false); setPublished(false); }

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (editVersion.current !== persistedVersion.current) { event.preventDefault(); }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  function openSettings() {
    setSettingsOpen(true);
  }

  async function publish() {
    setConfirmPublish(false);
    setPublishing(true);
    setPublishError(null);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const p = await queueSave();
      if (!p) return;
      if (editVersion.current !== persistedVersion.current) throw new Error('Your draft changed while saving. Please publish again.');
      const response = await fetch(`${base}/${encodeURIComponent(p.slug)}/publish`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` },
      });
      if (!response.ok) throw new Error('Could not publish. Your draft is saved; please try again.');
      const result = await response.json();
      postRef.current = result.data;
      setPost(result.data);
      setPublished(true);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'Could not publish. Please try again.');
    } finally { setPublishing(false); }
  }

  if (!publicationSlug || loadError) {
    return <div role="alert" style={{ padding: '40px' }}>{loadError ?? 'Choose a publication before writing.'} <Link href="/dashboard">Go to publications</Link></div>;
  }
  if (postId && !format) return <div style={{ padding: '40px' }}>Loading post…</div>;

  const status = post?.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-canvas)', fontFamily: 'var(--font-ui)' }}>
      {/* Top bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '52px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => { if (!dirty || window.confirm('You have unsaved changes. Leave the editor?')) router.push(`/dashboard/publications/${encodeURIComponent(publicationSlug)}`); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', padding: 0 }}>
            <ArrowLeft size={14} /> Posts
          </button>
          <StatusBadge status={status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!saving && dirty && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Unsaved changes</span>}
          {saving && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Saving…</span>}
          {!saving && saved && !saveError && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Saved</span>}
          <Button variant="ghost" size="sm" onClick={openSettings} aria-label="Post settings">
            <SettingsIcon size={14} style={{ marginRight: '6px' }} />
            Settings
          </Button>
          <Button size="sm" loading={publishing} onClick={() => status === 'PUBLISHED' ? void publish() : setConfirmPublish(true)}>
            {status === 'PUBLISHED' ? 'Update' : 'Publish'}
          </Button>
        </div>
      </header>

      {confirmPublish && <div role="dialog" aria-label="Confirm publication" style={{ padding: '16px 24px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <p>This will publish your post. If this publication sends newsletters, confirmed subscribers will be emailed.</p>
        <Button size="sm" onClick={() => void publish()}>Publish post</Button>{' '}
        <Button size="sm" variant="ghost" onClick={() => setConfirmPublish(false)}>Cancel</Button>
      </div>}
      {published && post && <div role="status" style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border)' }}>Post published. <a href={`${publicationSlug === '' ? '' : `//${publicationSlug}.${(process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000')}`}/${post.slug}`} target="_blank" rel="noreferrer">View post</a></div>}
      {saveError && <div role="alert" style={{ padding: '10px 24px', color: 'var(--color-danger)' }}>{saveError} <button onClick={() => void queueSave().catch(() => {})}>Try saving again</button></div>}
      {/* Session expired banner */}
      {authError && (
        <div style={{ background: 'var(--color-danger-light)', borderBottom: '1px solid var(--color-border)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-danger)', fontFamily: 'var(--font-ui)' }}>
          <span>Your session has expired.</span>
          <button onClick={() => router.push('/login')} style={{ fontWeight: 600, color: 'var(--color-danger)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-ui)' }}>Log in again</button>
        </div>
      )}

      {/* Publish error toast */}
      {publishError && (
        <div style={{ background: 'var(--color-danger-light)', borderBottom: '1px solid var(--color-border)', padding: '10px 24px', fontSize: '13px', color: 'var(--color-danger)', fontFamily: 'var(--font-ui)' }}>
          {publishError}
        </div>
      )}

      {/* Editor body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '48px 24px' }}>
        <div style={{ maxWidth: 'var(--max-content)', margin: '0 auto' }}>
          <textarea
            disabled={publishing}
            value={title}
            onChange={(e) => (markChanged(), setTitle(e.target.value))}
            placeholder="Give your post a title"
            rows={1}
            style={{ width: '100%', fontFamily: 'var(--font-reading)', fontSize: '36px', fontWeight: 600, color: 'var(--color-ink)', background: 'transparent', border: 'none', outline: 'none', resize: 'none', lineHeight: 1.2, marginBottom: '12px', overflow: 'hidden' }}
            onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
          />
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: '32px' }} />

          {format === 'MARKDOWN' ? (
            <textarea
              disabled={publishing}
              value={content}
              onChange={(e) => (markChanged(), setContent(e.target.value))}
              placeholder="Start writing… Markdown is supported."
              style={{ width: '100%', fontFamily: 'var(--font-code)', fontSize: '15px', lineHeight: 1.8, color: 'var(--color-ink)', background: 'transparent', border: 'none', outline: 'none', resize: 'none', minHeight: '60vh' }}
            />
          ) : (
            <BlockEditor blocks={blocks} onChange={(next) => { markChanged(); setBlocks(next); }} />
          )}
        </div>
      </div>

      <KeyboardHandler
        onSave={() => void queueSave().catch(() => {})}
        onPublish={() => status === 'PUBLISHED' ? void publish() : setConfirmPublish(true)}
        onSettings={openSettings}
      />

      {settingsOpen && (
        <PostSettingsPanel
          post={post}
          pubSlug={publicationSlug}
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
