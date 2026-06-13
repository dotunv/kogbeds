'use client';

import { useEffect, useState } from 'react';
import type { AnalyticsDayView } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const token = () => localStorage.getItem('access_token') ?? '';

type Window = 7 | 30 | 90;

export function AnalyticsDashboardPage({ pubSlug }: { pubSlug?: string }) {
  const [days, setDays]       = useState<Window>(30);
  const [data, setData]       = useState<AnalyticsDayView[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [subscribers, setSubscribers] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/analytics?days=${days}`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
      fetch(`${API}/subscribers`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
    ]).then(([analytics, subs]) => {
      const d: AnalyticsDayView[] = analytics.data ?? [];
      setData(d);
      setTotalViews(d.reduce((s, x) => s + x.views, 0));
      setSubscribers((subs.data ?? []).filter((s: { confirmed: boolean }) => s.confirmed).length);
      setLoading(false);
    });
  }, [days]);

  const maxViews = Math.max(...data.map((d) => d.views), 1);

  return (
    <div style={{ fontFamily: 'var(--font-ui)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)' }}>Analytics</h1>
        <div style={{ display: 'flex', gap: '4px' }}>
          {([7, 30, 90] as Window[]).map((w) => (
            <button key={w} onClick={() => setDays(w)}
              style={{ padding: '6px 12px', fontSize: '13px', background: days === w ? 'var(--color-accent-light)' : 'transparent', color: days === w ? 'var(--color-accent)' : 'var(--color-muted)', border: '1px solid', borderColor: days === w ? 'var(--color-accent)' : 'var(--color-border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
            >{w}d</button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading…</p>
      ) : data.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '15px', padding: '32px 0' }}>
          Analytics will appear after your first post is published.
        </p>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {[
              { label: 'Total views', value: totalViews },
              { label: 'Subscribers', value: subscribers },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                <p style={{ fontSize: '28px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>{value.toLocaleString()}</p>
                <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{label}</p>
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: '24px' }} />

          {/* Bar chart */}
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '16px' }}>Views per day</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px', marginBottom: '8px' }}>
            {data.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.views} views`}
                style={{
                  flex: 1,
                  height: `${(d.views / maxViews) * 100}%`,
                  minHeight: d.views > 0 ? '3px' : '0',
                  background: 'var(--color-accent)',
                  borderRadius: '2px 2px 0 0',
                  opacity: 0.7,
                  cursor: 'default',
                  transition: 'opacity 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
              />
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '24px 0' }} />

          {/* Top posts derived from data would come from per-post API */}
        </>
      )}
    </div>
  );
}
