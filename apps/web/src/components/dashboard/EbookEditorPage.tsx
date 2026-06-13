'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, GripVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Ebook, EbookChapter, PostFormat } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const token = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : '');

interface Props { paramsPromise: Promise<{ id: string }> }

export function EbookEditorPage({ paramsPromise }: Props) {
  const { id } = use(paramsPromise);
  const [ebook, setEbook]           = useState<Ebook | null>(null);
  const [chapters, setChapters]     = useState<EbookChapter[]>([]);
  const [activeOrder, setActive]    = useState<number | null>(null);
  const [activeChapter, setChap]    = useState<EbookChapter | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [newTitle, setNewTitle]     = useState('');
  const [newFormat, setNewFormat]   = useState<PostFormat>('MARKDOWN');

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token()}` };
    fetch(`${API}/ebooks/${id}`, { headers })
      .then((r) => r.json())
      .then((res) => {
        setEbook(res.data);
        const chaps: EbookChapter[] = res.data?.chapters ?? [];
        setChapters(chaps.sort((a, b) => a.order - b.order));
        if (chaps.length > 0) { setActive(chaps[0]!.order); setChap(chaps[0]!); }
      });
  }, [id]);

  function selectChapter(ch: EbookChapter) { setActive(ch.order); setChap({ ...ch }); setSaved(false); }

  async function saveChapter() {
    if (!activeChapter) return;
    setSaving(true);
    const res = await fetch(`${API}/ebooks/${id}/chapters/${activeChapter.order}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({
        title: activeChapter.title,
        markdownContent: activeChapter.format === 'MARKDOWN' ? activeChapter.markdownContent : undefined,
        blocks: activeChapter.format === 'BLOCKS' ? activeChapter.blocks : undefined,
      }),
    }).then((r) => r.json());
    if (!res.error) {
      setChapters((prev) => prev.map((c) => c.order === activeChapter.order ? { ...c, ...res.data } : c));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function addChapter() {
    if (!newTitle.trim()) return;
    const res = await fetch(`${API}/ebooks/${id}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ title: newTitle.trim(), format: newFormat, markdownContent: newFormat === 'MARKDOWN' ? '' : undefined, blocks: newFormat === 'BLOCKS' ? [] : undefined }),
    }).then((r) => r.json());
    if (!res.error) {
      const ch: EbookChapter = res.data;
      setChapters((prev) => [...prev, ch].sort((a, b) => a.order - b.order));
      setNewTitle(''); setShowAdd(false);
      selectChapter(ch);
    }
  }

  async function publishEbook() {
    if (!ebook) return;
    setPublishing(true);
    const endpoint = ebook.status === 'PUBLISHED' ? 'unpublish' : 'publish';
    const res = await fetch(`${API}/ebooks/${id}/${endpoint}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}` },
    }).then((r) => r.json());
    if (!res.error) setEbook((prev) => prev ? { ...prev, status: res.data.status } : prev);
    setPublishing(false);
  }

  if (!ebook) return <div style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--font-ui)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/dashboard/ebooks" style={{ color: 'var(--color-muted)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Ebooks
          </Link>
          <span style={{ color: 'var(--color-border)' }}>·</span>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>{ebook.title}</span>
          <span style={{
            fontSize: '11px', fontWeight: 500, borderRadius: '3px', padding: '2px 7px',
            color: ebook.status === 'PUBLISHED' ? '#16a34a' : '#6B6B68',
            background: ebook.status === 'PUBLISHED' ? '#f0fdf4' : '#F7F7F5',
          }}>{ebook.status}</span>
        </div>
        <Button size="sm" onClick={publishEbook} loading={publishing}>
          {ebook.status === 'PUBLISHED' ? 'Unpublish' : 'Publish ebook'}
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '0', flex: 1, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {/* Left panel — chapter list */}
        <div style={{ width: '240px', flexShrink: 0, borderRight: '1px solid var(--color-border)', background: 'var(--color-canvas)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Chapters</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {chapters.length === 0 ? (
              <p style={{ padding: '16px', fontSize: '13px', color: 'var(--color-muted)' }}>Add your first chapter to get started.</p>
            ) : chapters.map((ch) => (
              <button
                key={ch.id}
                onClick={() => selectChapter(ch)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 16px',
                  background: activeOrder === ch.order ? 'var(--color-surface)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <GripVertical size={12} style={{ color: 'var(--color-faint)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--color-ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ch.order}. {ch.title}
                </span>
              </button>
            ))}
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
            {showAdd ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Chapter title"
                  autoFocus
                  style={{ width: '100%', height: '32px', padding: '0 8px', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '13px', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  onKeyDown={(e) => e.key === 'Enter' && addChapter()}
                />
                <select value={newFormat} onChange={(e) => setNewFormat(e.target.value as PostFormat)} style={{ height: '32px', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '13px', fontFamily: 'var(--font-ui)' }}>
                  <option value="MARKDOWN">Markdown</option>
                  <option value="BLOCKS">Blocks</option>
                </select>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button size="sm" onClick={addChapter} disabled={!newTitle.trim()} style={{ flex: 1 }}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewTitle(''); }}>✕</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-accent)', padding: '4px 0' }}
              >
                <Plus size={14} /> Add chapter
              </button>
            )}
          </div>
        </div>

        {/* Right panel — editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)' }}>
          {activeChapter ? (
            <>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <input
                  value={activeChapter.title}
                  onChange={(e) => setChap((prev) => prev ? { ...prev, title: e.target.value } : prev)}
                  style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-ui)', flex: 1 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saved && <span style={{ fontSize: '12px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} /> Saved</span>}
                  <Button size="sm" onClick={saveChapter} loading={saving}>Save</Button>
                </div>
              </div>

              {activeChapter.format === 'MARKDOWN' ? (
                <textarea
                  value={activeChapter.markdownContent ?? ''}
                  onChange={(e) => setChap((prev) => prev ? { ...prev, markdownContent: e.target.value } : prev)}
                  placeholder="Write in Markdown…"
                  style={{
                    flex: 1, padding: '24px', border: 'none', outline: 'none', resize: 'none',
                    fontFamily: 'var(--font-code)', fontSize: '14px', lineHeight: 1.7,
                    color: 'var(--color-ink)', background: 'transparent',
                  }}
                />
              ) : (
                <div style={{ flex: 1, padding: '24px', color: 'var(--color-muted)', fontSize: '14px' }}>
                  Block editor for chapters — use the Markdown option for now.
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>
              Select a chapter to start editing, or add your first chapter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
