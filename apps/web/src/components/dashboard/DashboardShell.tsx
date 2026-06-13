'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, MessageSquare, Users, BarChart2, Settings,
  LogOut, BookOpen, ChevronLeft, LayoutGrid,
} from 'lucide-react';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

function pubNav(slug: string) {
  const base = `/dashboard/publications/${slug}`;
  return [
    { href: base,                  label: 'Posts',       icon: FileText },
    { href: `${base}/comments`,    label: 'Comments',    icon: MessageSquare },
    { href: `${base}/subscribers`, label: 'Subscribers', icon: Users },
    { href: `${base}/analytics`,   label: 'Analytics',   icon: BarChart2 },
    { href: `${base}/settings`,    label: 'Settings',    icon: Settings },
  ];
}

const ROOT_NAV = [
  { href: '/dashboard',        label: 'Publications', icon: LayoutGrid },
  { href: '/dashboard/ebooks', label: 'Ebooks',       icon: BookOpen },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pubMatch = pathname.match(/^\/dashboard\/publications\/([^/]+)/);
  const pubSlug  = pubMatch?.[1] ?? null;
  const nav      = pubSlug ? pubNav(pubSlug) : ROOT_NAV;
  const [username, setUsername] = useState('');

  useEffect(() => {
    setUsername(localStorage.getItem('grizzly_username') ?? '');
  }, []);

  function signOut() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('grizzly_username');
    window.location.href = '/login';
  }

  function isActive(href: string) {
    if (pubSlug) {
      const base = `/dashboard/publications/${pubSlug}`;
      return href === base ? pathname === base : pathname.startsWith(href);
    }
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-canvas)', fontFamily: 'var(--font-ui)' }}>

      {/* ── Sidebar ── */}
      <aside
        className="hidden md:flex"
        style={{
          width: 'var(--sidebar-width)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Wordmark */}
        <div style={{ padding: '18px 16px 4px', userSelect: 'none' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-reading)',
              fontSize: '17px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
              textDecoration: 'none',
              lineHeight: 1,
            }}
          >
            grizzly
          </Link>
        </div>

        {/* Context label */}
        {pubSlug && (
          <div style={{ padding: '6px 16px 12px' }}>
            <span style={{
              fontSize: '12px',
              color: 'var(--color-muted)',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.01em',
            }}>
              {pubSlug}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 8px 0', overflowY: 'auto' }}>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius)',
                  marginBottom: '1px',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: active ? 500 : 400,
                  color: active ? 'var(--color-ink)' : 'var(--color-muted)',
                  background: active ? 'var(--color-canvas)' : 'transparent',
                  transition: 'background var(--duration-fast), color var(--duration-fast)',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--color-canvas)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={15} strokeWidth={active ? 2 : 1.75} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--color-border)' }}>
          {pubSlug && (
            <Link
              href="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 10px',
                borderRadius: 'var(--radius)',
                fontSize: '13px',
                color: 'var(--color-muted)',
                textDecoration: 'none',
                marginBottom: '2px',
                transition: 'background var(--duration-fast), color var(--duration-fast)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-canvas)'; e.currentTarget.style.color = 'var(--color-ink)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-muted)'; }}
            >
              <ChevronLeft size={14} />
              All publications
            </Link>
          )}

          {/* User row */}
          <button
            onClick={signOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '7px 10px',
              borderRadius: 'var(--radius)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: 'var(--color-muted)',
              transition: 'background var(--duration-fast), color var(--duration-fast)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-canvas)'; e.currentTarget.style.color = 'var(--color-ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-muted)'; }}
          >
            {username && (
              <span style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'var(--color-accent-light)',
                color: 'var(--color-accent)',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                textTransform: 'uppercase',
              }}>
                {username[0]}
              </span>
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username ? `@${username}` : 'Sign out'}
            </span>
            <LogOut size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Mobile top bar */}
        <div
          className="flex md:hidden"
          style={{
            height: '52px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            padding: '0 16px',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Link href="/dashboard" style={{ fontFamily: 'var(--font-reading)', fontSize: '17px', fontWeight: 600, color: 'var(--color-ink)', textDecoration: 'none', letterSpacing: '-0.02em' }}>
            grizzly
          </Link>
          {pubSlug && (
            <Link href="/dashboard" style={{ fontSize: '13px', color: 'var(--color-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ChevronLeft size={14} /> Publications
            </Link>
          )}
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: '36px 40px', maxWidth: 'var(--max-dashboard)', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {children}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="flex md:hidden"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          justifyContent: 'space-around',
          padding: '6px 0 env(safe-area-inset-bottom)',
          zIndex: 40,
        }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '4px 16px',
                color: active ? 'var(--color-accent)' : 'var(--color-muted)',
                textDecoration: 'none',
                fontSize: '10px',
                fontWeight: active ? 500 : 400,
              }}
            >
              <Icon size={19} strokeWidth={active ? 2 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
