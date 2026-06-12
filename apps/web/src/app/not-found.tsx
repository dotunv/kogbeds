export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)', fontFamily: 'var(--font-ui)' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '64px', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 8px' }}>404</p>
        <p style={{ fontSize: '16px', color: 'var(--color-muted)', marginBottom: '28px' }}>This page doesn't exist.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a href="javascript:history.back()" style={{ display: 'inline-flex', alignItems: 'center', height: '38px', padding: '0 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: '14px', color: 'var(--color-ink)', textDecoration: 'none', fontFamily: 'var(--font-ui)' }}>
            ← Go back
          </a>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', height: '38px', padding: '0 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: '14px', color: 'var(--color-ink)', textDecoration: 'none', fontFamily: 'var(--font-ui)' }}>
            Go to discover
          </a>
        </div>
      </div>
    </div>
  );
}
