'use client';

import { useEffect, useState } from 'react';

type Props = { initial: string; accentColor: string; blogHref: string };

export function ReadingProgressArc({ initial, accentColor, blogHref }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el   = document.documentElement;
      const max  = el.scrollHeight - el.clientHeight;
      if (max <= 0) { setProgress(1); return; }
      setProgress(Math.min(1, el.scrollTop / max));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const size       = 40;
  const strokeW    = 2;
  const radius     = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset     = circumference * (1 - progress);

  return (
    <a href={blogHref} style={{ display: 'block', textDecoration: 'none' }} aria-label="Back to blog">
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Background circle */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            lineHeight: 1,
          }}>
            {initial}
          </span>
        </div>
        {/* Progress arc */}
        <svg
          width={size} height={size}
          style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={accentColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
      </div>
    </a>
  );
}
