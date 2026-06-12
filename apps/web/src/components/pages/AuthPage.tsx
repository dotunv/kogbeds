'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

const QUOTES = [
  { text: "I write entirely to find out what I'm thinking, what I'm looking at, what I see and what it means.", author: 'Joan Didion' },
  { text: 'Not everything that is faced can be changed, but nothing can be changed until it is faced.', author: 'James Baldwin' },
  { text: "If there's a book that you want to read, but it hasn't been written yet, then you must write it.", author: 'Toni Morrison' },
];

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Props = { mode: 'login' | 'register' };

export function AuthPage({ mode }: Props) {
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const [quoteIdx]              = useState(() => Math.floor(Math.random() * QUOTES.length));

  const quote = QUOTES[quoteIdx]!;
  const isRegister = mode === 'register';

  function validate() {
    const e: Record<string, string> = {};
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'At least 8 characters';
    if (isRegister) {
      if (!username) e.username = 'Username is required';
      else if (!/^[a-z0-9_]{3,30}$/.test(username)) e.username = 'Lowercase letters, numbers, _ (3–30 chars)';
    }
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setErrors({});
    try {
      const path = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister ? { email, username, password } : { email, password };
      const res  = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        const code = data?.error?.code ?? '';
        if (code === 'auth_email_taken')    setErrors({ email: 'Email already taken' });
        else if (code === 'auth_username_taken') setErrors({ username: 'Username already taken' });
        else if (code === 'auth_invalid_credentials') setErrors({ password: 'Invalid email or password' });
        else setErrors({ form: data?.error?.message ?? 'Something went wrong' });
        return;
      }
      // Store token and redirect
      if (data.data?.accessToken) {
        localStorage.setItem('access_token', data.data.accessToken);
      }
      window.location.href = '/dashboard';
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)', display: 'flex' }}>
      {/* Form column */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px',
          maxWidth: '520px',
        }}
      >
        <a href="/" style={{ fontFamily: 'var(--font-reading)', fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)', textDecoration: 'none', marginBottom: '48px', display: 'block' }}>
          grizzly
        </a>

        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: '24px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '32px' }}>
          {isRegister ? 'Create your blog' : 'Sign in'}
        </h1>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email */}
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginBottom: '6px', fontFamily: 'var(--font-ui)' }}>Email</label>
            <input
              id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => { const v = validate(); if (v.email) setErrors((p) => ({ ...p, email: v.email! })); }}
              style={inputStyle(!!errors.email)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && <p style={errStyle}>{errors.email}</p>}
          </div>

          {/* Username (register only) */}
          {isRegister && (
            <div>
              <label htmlFor="username" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginBottom: '6px', fontFamily: 'var(--font-ui)' }}>Username</label>
              <input
                id="username" type="text" value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                onBlur={() => { const v = validate(); if (v.username) setErrors((p) => ({ ...p, username: v.username! })); }}
                style={inputStyle(!!errors.username)}
                placeholder="yourname"
                autoComplete="username"
              />
              {username && !errors.username && (
                <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px', fontFamily: 'var(--font-ui)' }}>
                  {username}.{ROOT_DOMAIN.split(':')[0]}
                </p>
              )}
              {errors.username && <p style={errStyle}>{errors.username}</p>}
            </div>
          )}

          {/* Password */}
          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginBottom: '6px', fontFamily: 'var(--font-ui)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password" type={showPw ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => { const v = validate(); if (v.password) setErrors((p) => ({ ...p, password: v.password! })); }}
                style={{ ...inputStyle(!!errors.password), paddingRight: '44px' }}
                placeholder={isRegister ? 'Min. 8 characters' : ''}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '12px', fontFamily: 'var(--font-ui)' }}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <p style={errStyle}>{errors.password}</p>}
          </div>

          {errors.form && <p style={errStyle}>{errors.form}</p>}

          <Button type="submit" size="lg" loading={loading} style={{ marginTop: '8px' }}>
            {isRegister ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '14px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>
          {isRegister ? (
            <>Already have one? <a href="/login" style={{ color: 'var(--color-accent)' }}>Sign in</a></>
          ) : (
            <>New to Grizzly? <a href="/register" style={{ color: 'var(--color-accent)' }}>Create an account</a></>
          )}
        </p>
      </div>

      {/* Quote column — hidden on mobile */}
      <div
        style={{
          flex: 1,
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px',
        }}
        className="hidden md:flex"
      >
        <figure style={{ maxWidth: '360px' }}>
          <blockquote
            style={{
              fontFamily: 'var(--font-reading)',
              fontSize: '20px',
              fontStyle: 'italic',
              color: 'var(--color-muted)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            "{quote.text}"
          </blockquote>
          <figcaption style={{ marginTop: '16px', fontSize: '14px', color: 'var(--color-faint)', fontFamily: 'var(--font-ui)' }}>
            — {quote.author}
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    height: '38px',
    padding: '0 12px',
    border: `1px solid ${hasError ? 'var(--color-danger)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-ui)',
    fontSize: '14px',
    color: 'var(--color-ink)',
    background: 'var(--color-surface)',
    outline: 'none',
  };
}

const errStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-danger)',
  marginTop: '4px',
  fontFamily: 'var(--font-ui)',
};
