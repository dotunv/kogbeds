'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Blog } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const token = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : '');

export function BlogSettingsPage() {
  const [blog, setBlog]           = useState<Blog | null>(null);
  const [title, setTitle]         = useState('');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState('#2D6BE4');
  const [footerText, setFooterText] = useState('');
  const [isPublic, setIsPublic]   = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  // Custom domain state
  const [domain, setDomain]       = useState('');
  const [txtRecord, setTxtRecord] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<'ok' | 'fail' | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    fetch(`${API}/blogs/me`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((r) => {
        const b: Blog = r.data;
        setBlog(b);
        setTitle(b.title);
        setDescription(b.description);
        setAccentColor(b.accentColor ?? '#2D6BE4');
        setFooterText(b.footerText ?? '');
        setIsPublic(b.isPublic);
        if (b.customDomain) setDomain(b.customDomain);
      });
  }, []);

  async function save() {
    setSaving(true);
    await fetch(`${API}/blogs/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ title, description, accentColor, footerText, isPublic }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function connectDomain() {
    const res = await fetch(`${API}/blogs/me/domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ domain }),
    }).then((r) => r.json());
    setTxtRecord(res.data?.txtRecord ?? '');
  }

  async function verifyDomain() {
    setVerifying(true);
    setVerifyResult(null);
    const res = await fetch(`${API}/blogs/me/domain/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
    }).then((r) => r.json());
    setVerifyResult(res.data?.verified ? 'ok' : 'fail');
    setVerifying(false);
  }

  async function removeDomain() {
    await fetch(`${API}/blogs/me/domain`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setDomain('');
    setTxtRecord('');
    setVerifyResult(null);
  }

  async function deleteBlog() {
    if (!blog || deleteConfirm !== blog.slug) return;
    await fetch(`${API}/blogs/me`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    localStorage.removeItem('access_token');
    window.location.href = '/';
  }

  if (!blog) return <div style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading…</div>;

  return (
    <div style={{ maxWidth: '600px', fontFamily: 'var(--font-ui)' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '32px' }}>Blog settings</h1>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
        <Field label="Blog name">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} style={iSty} />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} style={{ ...iSty, height: 'auto', padding: '8px 12px', resize: 'vertical' }} />
        </Field>
        <Field label="Accent color">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ width: '40px', height: '32px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', cursor: 'pointer', padding: '2px' }} />
            <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} maxLength={7} style={{ ...iSty, width: '110px' }} />
            <button style={{ height: '32px', padding: '0 14px', background: accentColor, color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontSize: '13px', cursor: 'pointer' }}>Subscribe</button>
          </div>
        </Field>
        <Field label="Footer text">
          <input value={footerText} onChange={(e) => setFooterText(e.target.value)} maxLength={300} style={iSty} placeholder="Optional" />
        </Field>
      </section>

      <Divider />

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '16px' }}>Custom domain</h2>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourdomain.com" style={{ ...iSty, flex: 1 }} />
          <Button size="sm" onClick={connectDomain} disabled={!domain}>Connect</Button>
        </div>
        {txtRecord && (
          <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '14px', fontSize: '13px', marginBottom: '12px' }}>
            <p style={{ marginBottom: '8px', color: 'var(--color-ink)', fontWeight: 500 }}>Add this TXT record to your DNS:</p>
            <p style={{ color: 'var(--color-muted)', marginBottom: '4px' }}>Name: <code style={{ fontFamily: 'var(--font-code)' }}>_grizzly-verify.{domain}</code></p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <code style={{ fontFamily: 'var(--font-code)', flex: 1, color: 'var(--color-ink)' }}>{txtRecord}</code>
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
        {blog.customDomain && blog.domainVerified && (
          <Button size="sm" variant="danger" onClick={removeDomain} style={{ marginTop: '8px' }}>Remove domain</Button>
        )}
      </section>

      <Divider />

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '12px' }}>Visibility</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[true, false].map((v) => (
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

      <section style={{ marginTop: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '12px' }}>Danger zone</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '10px' }}>Type your blog slug to confirm deletion: <strong>{blog.slug}</strong></p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={blog.slug} style={{ ...iSty, maxWidth: '200px' }} />
          <Button variant="danger" disabled={deleteConfirm !== blog.slug} onClick={deleteBlog}>Delete blog</Button>
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
  background: 'var(--color-surface)', outline: 'none',
};
