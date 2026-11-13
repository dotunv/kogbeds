'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-canvas)',
            fontFamily: 'var(--font-ui)',
            padding: '24px',
          }}
        >
          <p
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              margin: '0 0 8px',
            }}
          >
            Something went wrong
          </p>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-muted)',
              margin: '0 0 24px',
              textAlign: 'center',
              maxWidth: '400px',
            }}
          >
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
