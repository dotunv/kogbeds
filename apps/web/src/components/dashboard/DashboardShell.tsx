'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FileText, MessageSquare, Users, BarChart2, Settings, LogOut } from 'lucide-react';

const NAV = [
  { href: '/dashboard',              label: 'Posts',       icon: FileText },
  { href: '/dashboard/comments',     label: 'Comments',    icon: MessageSquare },
  { href: '/dashboard/subscribers',  label: 'Subscribers', icon: Users },
  { href: '/dashboard/analytics',    label: 'Analytics',   icon: BarChart2 },
  { href: '/dashboard/settings',     label: 'Settings',    icon: Settings },
];

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function signOut() {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  }

  const username = typeof window !== 'undefined' ? (localStorage.getItem('grizzly_username') ?? '') : '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-canvas)', fontFamily: 'var(--font-ui)' }}>
      {/* Sidebar — desktop */}
      <aside
        style={{
          width: 'var(--sidebar-width)',
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
        className="hidden md:flex"
      >
        {/* Top */}
        <div style={{ padding: '20px 20px 0' }}>
          <a href="/" style={{ fontFamily: 'var(--font-reading)', fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
            grizzly
          </a>
          {username && (
            <a
              href={`http://${username}.${ROOT_DOMAIN.split(':')[0]}${ROOT_DOMAIN.includes(':') ? `:${ROOT_DOMAIN.split(':')[1]}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: 'var(--color-muted)', textDecoration: 'none' }}
            >
              {username}.{ROOT_DOMAIN.split(':')[0]} ↗
            </a>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '24px 12px' }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius)',
                  borderLeft: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                  color: active ? 'var(--color-accent)' : 'var(--color-muted)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: active ? 500 : 400,
                  marginBottom: '2px',
                  background: active ? 'var(--color-accent-light)' : 'transparent',
                }}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={signOut}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '13px', padding: '4px 0' }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Mobile top bar */}
        <div
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          className="flex md:hidden"
        >
          <a href="/" style={{ fontFamily: 'var(--font-reading)', fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', textDecoration: 'none' }}>
            grizzly
          </a>
        </div>

        <div style={{ padding: '32px 32px', maxWidth: 'var(--max-dashboard)', margin: '0 auto' }}>
          {children}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '8px 0 env(safe-area-inset-bottom)',
          zIndex: 40,
        }}
        className="flex md:hidden"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '4px 12px',
                color: active ? 'var(--color-accent)' : 'var(--color-muted)',
                textDecoration: 'none',
                fontSize: '10px',
              }}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
