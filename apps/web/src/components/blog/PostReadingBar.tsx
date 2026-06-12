'use client';

import { useEffect, useState } from 'react';
import { ReadingProgressArc } from './ReadingProgressArc';
import { Sun, Moon, Type, MoreHorizontal } from 'lucide-react';

type Props = {
  blogTitle: string;
  blogHref: string;
  accentColor: string;
};

export function PostReadingBar({ blogTitle, blogHref, accentColor }: Props) {
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY]     = useState(0);
  const [theme, setTheme]     = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('grizzly-theme') as 'light' | 'dark' | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute('data-theme', stored);
    }
  }, []);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setVisible(y < lastY || y < 60);
      setLastY(y);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastY]);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('grizzly-theme', next);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
  }

  const initial = (blogTitle[0] ?? 'G').toUpperCase();

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 200ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
        height: '56px',
      }}
    >
      <ReadingProgressArc initial={initial} accentColor={accentColor} blogHref={blogHref} />

      <a
        href={blogHref}
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '14px',
          color: 'var(--color-muted)',
          textDecoration: 'none',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {blogTitle}
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={toggleTheme}
          style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', borderRadius: 'var(--radius)' }}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button
          onClick={copyLink}
          style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', borderRadius: 'var(--radius)' }}
          aria-label="Copy link"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </header>
  );
}
