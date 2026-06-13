'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, Settings, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Publication, Ebook, PublicationType } from '@/lib/types';
import { getPublicationUrl } from '@/lib/utils';

const API         = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
const token = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : '');

// ─── Type badge ───────────────────────────────────────────────────────────────

const TYPE_META: Record<PublicationType, { label: string; dot: string }> = {
  BOTH:       { label: 'Blog + Newsletter', dot: 'var(--color-accent)' },
  BLOG:       { label: 'Blog',              dot: 'var(--color-success)' },
  NEWSLETTER: { label: 'Newsletter',        dot: 'var(--color-warning)' },
};

function TypeBadge({ type }: { type: PublicationType }) {
  const { label, dot } = TYPE_META[type];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '11.5px',
      fontWeight: 500,
      color: 'var(--color-muted)',
      fontFamily: 'var(--font-ui)',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function EbookStatusDot({ status }: { status: string }) {
  const published = status === 'PUBLISHED';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: '11.5px', fontWeight: 500,
      color: published ? 'var(--color-success)' : 'var(--color-faint)',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
        background: published ? 'var(--color-success)' : 'var(--color-faint)',
      }} />
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

// ─── Publication card ─────────────────────────────────────────────────────────

function PublicationCard({ pub }: { pub: Publication }) {
  const pubUrl = getPublicationUrl(pub.slug, ROOT_DOMAIN, pub.customDomain);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        background: 'var(--color-surface)',
        padding: '18px 20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'box-shadow var(--duration-fast), border-color var(--duration-fast)',
        boxShadow: hovered ? 'var(--shadow-sm)' : 'none',
        borderColor: hovered ? 'var(--color-border-strong)' : 'var(--color-border)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: accent line + title + actions */}
      <div style={{
        position: 'absolute',
        top: 0, left: '20px', right: '20px',
        height: '2px',
        borderRadius: '0 0 2px 2px',
        background: pub.accentColor ?? 'var(--color-accent)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity var(--duration-base)',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            margin: '0 0 4px',
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {pub.title || pub.slug}
          </p>
          <TypeBadge type={pub.type} />
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginTop: '2px' }}>
          <a
            href={pubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px',
              borderRadius: 'var(--radius)',
              color: 'var(--color-faint)',
              transition: 'color var(--duration-fast), background var(--duration-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'var(--color-canvas)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-faint)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <ExternalLink size={13} />
          </a>
          <Link
            href={`/dashboard/publications/${pub.slug}/settings`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px',
              borderRadius: 'var(--radius)',
              color: 'var(--color-faint)',
              textDecoration: 'none',
              transition: 'color var(--duration-fast), background var(--duration-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'var(--color-canvas)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-faint)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Settings size={13} />
          </Link>
        </div>
      </div>

      {pub.description && (
        <p style={{
          fontSize: '13px',
          color: 'var(--color-muted)',
          lineHeight: 1.5,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {pub.description}
        </p>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--color-faint)' }}>
        <span>{pub._count?.posts ?? 0} posts</span>
        <span>{pub._count?.subscribers ?? 0} subscribers</span>
      </div>

      {/* CTA */}
      <Link
        href={`/dashboard/publications/${pub.slug}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderRadius: 'var(--radius)',
          background: 'var(--color-canvas)',
          textDecoration: 'none',
          marginTop: '2px',
          transition: 'background var(--duration-fast)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-border)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-canvas)'; }}
      >
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>Open posts</span>
        <ArrowRight size={13} style={{ color: 'var(--color-muted)' }} />
      </Link>
    </div>
  );
}

// ─── New publication modal ────────────────────────────────────────────────────

function NewPublicationModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (pub: Publication) => void;
}) {
  const [slug, setSlug]     = useState('');
  const [title, setTitle]   = useState('');
  const [type, setType]     = useState<PublicationType>('BOTH');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const backdropRef         = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function create() {
    if (!slug.trim()) return;
    setSaving(true);
    setError('');
    const res = await fetch(`${API}/publications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ slug, title: title || undefined, type }),
    }).then((r) => r.json());
    if (res.error) {
      setError(res.error.message ?? 'Failed to create publication.');
    } else {
      onCreated(res.data);
    }
    setSaving(false);
  }

  const TYPE_OPTIONS: { value: PublicationType; label: string; desc: string }[] = [
    { value: 'BOTH',       label: 'Blog + Newsletter', desc: 'Public posts and email sends'  },
    { value: 'BLOG',       label: 'Blog only',         desc: 'Public posts, no newsletter'   },
    { value: 'NEWSLETTER', label: 'Newsletter only',   desc: 'Email only, no public pages'   },
  ];

  return (
    <>
      <div
        ref={backdropRef}
        onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          style={{
            width: '440px',
            maxWidth: '92vw',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            fontFamily: 'var(--font-ui)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 4px' }}>
              New publication
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: 0 }}>
              Each publication gets its own subdomain and subscriber list.
            </p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

          <Field label="Subdomain slug">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-publication"
              maxLength={50}
              autoFocus
              style={iSty}
              onKeyDown={(e) => e.key === 'Enter' && void create()}
            />
            <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px', fontFamily: 'var(--font-code)' }}>
              {slug ? `${slug}.${ROOT_DOMAIN.split(':')[0]}` : 'yourslug.grizzly.app'}
            </p>
          </Field>

          <Field label="Name (optional)">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Publication"
              maxLength={100}
              style={iSty}
            />
          </Field>

          <Field label="Type">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {TYPE_OPTIONS.map(({ value, label, desc }) => (
                <label
                  key={value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius)',
                    border: `1px solid ${type === value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: type === value ? 'var(--color-accent-light)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'border-color var(--duration-fast), background var(--duration-fast)',
                  }}
                >
                  <input
                    type="radio"
                    name="pub-type"
                    checked={type === value}
                    onChange={() => setType(value)}
                    style={{ accentColor: 'var(--color-accent)', margin: 0 }}
                  />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '11.5px', color: 'var(--color-muted)', margin: 0 }}>{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={create} loading={saving} disabled={!slug.trim()}>
              Create publication
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PublicationsOverviewPage() {
  const [pubs, setPubs]         = useState<Publication[]>([]);
  const [ebooks, setEbooks]     = useState<Ebook[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showNewPub, setShowNewPub] = useState(false);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token()}` };
    Promise.all([
      fetch(`${API}/publications`, { headers }).then((r) => r.json()),
      fetch(`${API}/ebooks`,       { headers }).then((r) => r.json()),
    ]).then(([pubRes, ebookRes]) => {
      setPubs(pubRes.data ?? []);
      setEbooks(ebookRes.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ color: 'var(--color-faint)', fontSize: '14px', paddingTop: '8px' }}>Loading…</div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-ui)' }}>

      {/* ── Publications ── */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
              Publications
            </h1>
            {pubs.length > 0 && (
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: 0 }}>
                {pubs.length} of 10
              </p>
            )}
          </div>
          <Button size="sm" onClick={() => setShowNewPub(true)}>
            <Plus size={13} style={{ marginRight: '5px' }} />
            New
          </Button>
        </div>

        {pubs.length === 0 ? (
          <div style={{
            padding: '56px 24px',
            textAlign: 'center',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius)',
          }}>
            <p style={{ fontSize: '15px', color: 'var(--color-ink)', margin: '0 0 4px', fontWeight: 500 }}>
              No publications yet
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 20px' }}>
              Create one to start writing.
            </p>
            <Button size="sm" onClick={() => setShowNewPub(true)}>
              <Plus size={13} style={{ marginRight: '5px' }} />
              Create publication
            </Button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px',
          }}>
            {pubs.map((pub) => (
              <PublicationCard key={pub.id} pub={pub} />
            ))}
          </div>
        )}
      </section>

      {/* ── Ebooks ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.01em' }}>
            Ebooks
          </h2>
          <Link href="/dashboard/ebooks/new" style={{ textDecoration: 'none' }}>
            <Button size="sm" variant="ghost">
              <Plus size={13} style={{ marginRight: '5px' }} />
              New ebook
            </Button>
          </Link>
        </div>

        {ebooks.length === 0 ? (
          <p style={{ fontSize: '13.5px', color: 'var(--color-muted)', margin: 0 }}>
            No ebooks yet.{' '}
            <Link href="/dashboard/ebooks/new" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
              Create your first
            </Link>.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ebooks.map((book, i) => (
              <Link
                key={book.id}
                href={`/dashboard/ebooks/${book.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 0',
                  borderTop: i === 0 ? '1px solid var(--color-border)' : 'none',
                  borderBottom: '1px solid var(--color-border)',
                  textDecoration: 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--color-ink)',
                    margin: '0 0 3px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {book.title}
                  </p>
                  <EbookStatusDot status={book.status} />
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-faint)', flexShrink: 0 }}>
                  {book._count?.chapters ?? book.chapters?.length ?? 0} ch.
                </span>
                <ArrowRight size={13} style={{ color: 'var(--color-faint)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {showNewPub && (
        <NewPublicationModal
          onClose={() => setShowNewPub(false)}
          onCreated={(pub) => { setPubs((prev) => [...prev, pub]); setShowNewPub(false); }}
        />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, color: 'var(--color-muted)', marginBottom: '6px', letterSpacing: '0.01em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const iSty: React.CSSProperties = {
  width: '100%',
  height: '36px',
  padding: '0 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-ui)',
  fontSize: '13.5px',
  color: 'var(--color-ink)',
  background: 'var(--color-surface)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color var(--duration-fast)',
};
