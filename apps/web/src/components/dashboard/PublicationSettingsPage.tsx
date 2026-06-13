'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Publication, PublicationType } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
const token = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : '');

type Props = { pubSlug: string };

export function PublicationSettingsPage({ pubSlug }: Props) {
  const [pub, setPub]             = useState<Publication | null>(null);
  const [title, setTitle]         = useState('');
  const [description, setDescription] = useState('');
  const [type, setType]           = useState<PublicationType>('BOTH');
  const [accentColor, setAccentColor] = useState('#2D6BE4');
  const [footerText, setFooterText] = useState('');
  const [isPublic, setIsPublic]   = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [typeWarning, setTypeWarning] = useState('');

  // Custom domain state
  const [domain, setDomain]       = useState('');
  const [txtRecord, setTxtRecord] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<'ok' | 'fail' | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    fetch(`${API}/publications/${pubSlug}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((r) => {
        const p: Publication = r.data;
        setPub(p);
        setTitle(p.title);
        setDescription(p.description ?? '');
        setType(p.type);
        setAccentColor(p.accentColor ?? '#2D6BE4');
        setFooterText(p.footerText ?? '');
        setIsPublic(p.isPublic);
        if (p.customDomain) setDomain(p.customDomain);
      });
  }, [pubSlug]);

  function handleTypeChange(newType: PublicationType) {
    if (!pub) return;
    const cur = pub.type;
    let warning = '';
    if (cur === 'BOTH' && newType === 'BLOG') warning = 'Newsletter sends will stop. Subscriber list is preserved.';
    if (cur === 'BOTH' && newType === 'NEWSLETTER') warning = 'Public blog pages will become inaccessible. Content is preserved.';
    if (cur === 'BLOG' && newType === 'NEWSLETTER') warning = 'Public blog pages will become inaccessible. Content is preserved.';
    if (cur === 'NEWSLETTER' && newType === 'BLOG') warning = 'Newsletter sends will stop. Subscriber list is preserved.';
    setTypeWarning(warning);
    setType(newType);
  }

  async function save() {
    setSaving(true);
    await fetch(`${API}/publications/${pubSlug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ title, description, type, accentColor, footerText, isPublic }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function connectDomain() {
    const res = await fetch(`${API}/publications/${pubSlug}/domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ domain }),
    }).then((r) => r.json());
    setTxtRecord(res.data?.txtRecord ?? '');
  }

  async function verifyDomain() {
    setVerifying(true);
    setVerifyResult(null);
    const res = await fetch(`${API}/publications/${pubSlug}/domain/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
    }).then((r) => r.json());
    setVerifyResult(res.data?.verified ? 'ok' : 'fail');
    setVerifying(false);
  }

  async function removeDomain() {
    await fetch(`${API}/publications/${pubSlug}/domain`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setDomain('');
    setTxtRecord('');
    setVerifyResult(null);
  }

  async function deletePublication() {
    if (!pub || deleteConfirm !== pub.slug) return;
    await fetch(`${API}/publications/${pubSlug}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    window.location.href = '/dashboard';
  }

  if (!pub) return <div style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading…</div>;

  const pubPreviewUrl = `${pub.slug}.${ROOT_DOMAIN.split(':')[0]}`;

  return (
    <div style={{ maxWidth: '600px', fontFamily: 'var(--font-ui)' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '32px' }}>Publication settings</h1>

      {/* Basic info */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
        <Field label="Publication name">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} style={iSty} />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            style={{ ...iSty, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
          />
        </Field>
        <Field label="Footer text">
          <input value={footerText} onChange={(e) => setFooterText(e.target.value)} maxLength={300} style={iSty} />
        </Field>
      </section>

      <Divider />

      {/* Publication type */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '12px' }}>Type</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {([
            { value: 'BOTH',       label: 'Blog + Newsletter', desc: 'Public website and email newsletter' },
            { value: 'BLOG',       label: 'Blog only',         desc: 'Public website, no newsletter sends' },
            { value: 'NEWSLETTER', label: 'Newsletter only',   desc: 'Email newsletter, no public blog pages' },
          ] as { value: PublicationType; label: string; desc: string }[]).map(({ value, label, desc }) => (
            <label key={value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '10px 12px', border: `1px solid ${type === value ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 'var(--radius)', background: type === value ? 'var(--color-accent-light)' : 'var(--color-surface)' }}>
              <input type="radio" checked={type === value} onChange={() => handleTypeChange(value)} style={{ marginTop: '2px' }} />
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted)' }}>{desc}</p>
              </div>
            </label>
          ))}
        </div>
        {typeWarning && (
          <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--color-warning)', background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
            {typeWarning}
          </p>
        )}
      </section>

      <Divider />

      {/* Accent color */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '12px' }}>Accent color</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            style={{ width: '40px', height: '40px', padding: '2px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'none' }}
          />
          <input
            value={accentColor}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setAccentColor(v);
            }}
            maxLength={7}
            style={{ ...iSty, width: '100px' }}
          />
          <span
            style={{
              display: 'inline-block', padding: '6px 16px', borderRadius: 'var(--radius)',
              background: accentColor, color: '#fff', fontSize: '13px', fontWeight: 500,
            }}
          >
            Preview
          </span>
        </div>
      </section>

      <Divider />

      {/* Custom domain */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>Custom domain</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '12px' }}>
          Currently served at: <code style={{ fontFamily: 'var(--font-code)' }}>{pubPreviewUrl}</code>
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourdomain.com" style={{ ...iSty, flex: 1 }} />
          <Button size="sm" onClick={connectDomain} disabled={!domain}>Connect</Button>
        </div>
        {txtRecord && (
          <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '14px', fontSize: '13px', marginBottom: '12px' }}>
            <p style={{ marginBottom: '8px', color: 'var(--color-ink)', fontWeight: 500 }}>Add this TXT record to your DNS:</p>
            <p style={{ color: 'var(--color-muted)', marginBottom: '4px' }}>
              Name: <code style={{ fontFamily: 'var(--font-code)' }}>_grizzly-verify.{domain}</code>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <code style={{ fontFamily: 'var(--font-code)', flex: 1, color: 'var(--color-ink)', wordBreak: 'break-all' }}>{txtRecord}</code>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(txtRecord)}>Copy</Button>
            </div>
          </div>
        )}
        {txtRecord && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button size="sm" variant="ghost" onClick={verifyDomain} loading={verifying}>Check verification</Button>
            {verifyResult === 'ok'   && <span style={{ fontSize: '13px', color: 'var(--color-success)' }}>✓ {domain} is connected</span>}
            {verifyResult === 'fail' && <span style={{ fontSize: '13px', color: 'var(--color-danger)' }}>✗ TXT record not found yet. DNS can take up to 24h.</span>}
          </div>
        )}
        {pub.customDomain && pub.domainVerified && (
          <Button size="sm" variant="danger" onClick={removeDomain} style={{ marginTop: '8px' }}>Remove domain</Button>
        )}
      </section>

      <Divider />

      {/* Visibility */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '12px' }}>Visibility</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          {([true, false] as const).map((v) => (
            <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', color: 'var(--color-ink)' }}>
              <input type="radio" checked={isPublic === v} onChange={() => setIsPublic(v)} />
              {v ? 'Public' : 'Private'}
            </label>
          ))}
        </div>
      </section>

      <Divider />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
        <Button onClick={save} loading={saving}>Save changes</Button>
        {saved && <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Saved ✓</span>}
      </div>

      <Divider />

      {/* Danger zone */}
      <section style={{ marginTop: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '12px' }}>Danger zone</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '10px' }}>
          Type the publication slug to confirm deletion: <strong>{pub.slug}</strong>
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={pub.slug}
            style={{ ...iSty, maxWidth: '200px' }}
          />
          <Button variant="danger" disabled={deleteConfirm !== pub.slug} onClick={deletePublication}>
            Delete publication
          </Button>
        </div>
      </section>
    </div>
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

function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 0 24px' }} />;
}

const iSty: React.CSSProperties = {
  width: '100%', height: '38px', padding: '0 12px',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--color-ink)',
  background: 'var(--color-surface)', outline: 'none', boxSizing: 'border-box',
};
