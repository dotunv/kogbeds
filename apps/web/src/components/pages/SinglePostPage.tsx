'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Publication, Post, Comment, Block } from '@/lib/types';
import { PostReadingBar } from '@/components/blog/PostReadingBar';
import { SubscribeBar } from '@/components/blog/SubscribeBar';
import { Button } from '@/components/ui/Button';
import { formatDate, readingTime, getBlogUrl } from '@/lib/utils';

const API         = process.env.NEXT_PUBLIC_API_URL     ?? 'http://localhost:3000';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

type Props = { username: string; slug: string };

export function SinglePostPage({ username, slug }: Props) {
  const [blog, setBlog]           = useState<Publication | null>(null);
  const [post, setPost]           = useState<Post | null>(null);
  const [comments, setComments]   = useState<Comment[]>([]);
  const [notFound, setNotFound]   = useState(false);
  const blogHref = getBlogUrl(username, ROOT_DOMAIN);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/publications/${username}`).then((r) => r.json()).then((r) => r.data ?? r),
      fetch(`${API}/publications/${username}/posts/${slug}`).then((r) => r.json()).then((r) => r.data ?? r),
    ])
      .then(([b, p]) => { setBlog(b); setPost(p); })
      .catch(() => setNotFound(true));

    fetch(`${API}/publications/${username}/posts/${slug}/comments`)
      .then((r) => r.json())
      .then((r) => setComments(r.data ?? []));

    fetch(`${API}/analytics/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, postSlug: slug }),
    }).catch(() => {});
  }, [username, slug]);

  if (notFound) return <NotFoundState blogHref={blogHref} />;
  if (!blog || !post) return null;

  const accent     = blog.accentColor ?? '#2D6BE4';
  const showSub    = blog.type === 'NEWSLETTER' || blog.type === 'BOTH';
  const fmt        = post.format ?? (post.markdownContent ? 'MARKDOWN' : 'BLOCKS');
  const plainText  = post.markdownContent ?? (post.blocks ?? []).map(blockToText).join(' ');
  const mins       = readingTime(plainText);

  return (
    <div style={{ background: 'var(--color-canvas)', minHeight: '100vh' }}>
      <PostReadingBar blogTitle={blog.title || username} blogHref={blogHref} accentColor={accent} />

      <main style={{ paddingTop: '80px', paddingBottom: '96px' }}>
        <article style={{ maxWidth: 'var(--max-content)', margin: '0 auto', padding: '0 24px' }}>

          {/* ── Back link ── */}
          <div style={{ marginBottom: '40px' }}>
            <Link href={blogHref} style={{
              fontSize: '13px',
              color: 'var(--color-muted)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              ← {blog.title || username}
            </Link>
          </div>

          {/* ── Post header ── */}
          <header style={{ marginBottom: '44px' }}>
            {post.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {post.tags.map((t) => (
                  <span key={t.id} style={{ fontSize: '12px', color: accent, fontFamily: 'var(--font-ui)' }}>
                    #{t.name}
                  </span>
                ))}
              </div>
            )}
            <h1 style={{
              fontFamily: 'var(--font-reading)',
              fontSize: 'clamp(26px, 5vw, 36px)',
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              margin: '0 0 18px',
            }}>
              {post.title}
            </h1>
            {post.excerpt && (
              <p style={{
                fontFamily: 'var(--font-reading)',
                fontSize: '18px',
                color: 'var(--color-muted)',
                lineHeight: 1.6,
                margin: '0 0 18px',
              }}>
                {post.excerpt}
              </p>
            )}
            <p style={{ fontSize: '13px', color: 'var(--color-faint)', fontFamily: 'var(--font-ui)', margin: 0 }}>
              {post.publishedAt ? formatDate(post.publishedAt) : ''}
              {mins > 0 && ` · ${mins} min read`}
            </p>
          </header>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: '44px' }} />

          {/* ── Post content ── */}
          <div className="prose" style={{ fontFamily: 'var(--font-reading)' }}>
            {fmt === 'MARKDOWN' && post.markdownContent
              ? <MarkdownContent content={post.markdownContent} />
              : <BlocksContent blocks={(post.blocks ?? []) as Block[]} accentColor={accent} />
            }
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '56px 0' }} />

          {showSub && (
            <>
              <SubscribeBar blogId={blog.id} username={username} accentColor={accent} />
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '56px 0' }} />
            </>
          )}

          {/* ── Comments ── */}
          <CommentsSection postSlug={slug} username={username} comments={comments} />

          {/* ── Footer ── */}
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '56px 0 32px' }} />
          <footer style={{ fontSize: '12px', color: 'var(--color-faint)', fontFamily: 'var(--font-ui)' }}>
            {blog.footerText || (
              <span>Published with <a href="/" style={{ color: 'var(--color-faint)', textDecoration: 'underline', textDecorationColor: 'var(--color-border)' }}>Grizzly</a></span>
            )}
          </footer>
        </article>
      </main>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div style={{
      whiteSpace: 'pre-wrap',
      fontFamily: 'var(--font-reading)',
      fontSize: '18px',
      lineHeight: 1.82,
      color: 'var(--color-ink)',
    }}>
      {content}
    </div>
  );
}

function BlocksContent({ blocks, accentColor }: { blocks: Block[]; accentColor: string }) {
  return (
    <div>
      {blocks.map((block, i) => <BlockRenderer key={i} block={block} accentColor={accentColor} />)}
    </div>
  );
}

function BlockRenderer({ block, accentColor }: { block: Block; accentColor: string }) {
  const prose18: React.CSSProperties = { fontFamily: 'var(--font-reading)', fontSize: '18px', lineHeight: 1.82 };
  switch (block.type) {
    case 'PARAGRAPH':
      return <p style={{ ...prose18, marginBottom: '22px' }}>{block.content}</p>;
    case 'HEADING_1':
      return <h2 style={{ fontFamily: 'var(--font-reading)', fontSize: '28px', fontWeight: 600, marginTop: '52px', marginBottom: '18px', lineHeight: 1.2, letterSpacing: '-0.01em' }}>{block.content}</h2>;
    case 'HEADING_2':
      return <h3 style={{ fontFamily: 'var(--font-reading)', fontSize: '22px', fontWeight: 600, marginTop: '44px', marginBottom: '14px', lineHeight: 1.25 }}>{block.content}</h3>;
    case 'HEADING_3':
      return <h4 style={{ fontFamily: 'var(--font-reading)', fontSize: '19px', fontWeight: 600, marginTop: '36px', marginBottom: '12px', lineHeight: 1.3 }}>{block.content}</h4>;
    case 'BLOCKQUOTE':
      return (
        <blockquote style={{
          borderLeft: `2px solid ${accentColor}`,
          paddingLeft: '22px',
          margin: '28px 0',
          color: 'var(--color-muted)',
          fontStyle: 'italic',
          ...prose18,
        }}>
          {block.content}
        </blockquote>
      );
    case 'CODE':
      return (
        <pre style={{
          fontFamily: 'var(--font-code)',
          fontSize: '13.5px',
          background: '#0F0F0D',
          color: '#D4D4C8',
          borderRadius: 'var(--radius)',
          padding: '20px 24px',
          overflowX: 'auto',
          lineHeight: 1.65,
          margin: '28px 0',
        }}>
          <code>{block.content}</code>
        </pre>
      );
    case 'ORDERED_LIST':
      return <ol style={{ ...prose18, paddingLeft: '26px', marginBottom: '22px' }}>{block.items.map((item, i) => <li key={i} style={{ marginBottom: '6px' }}>{item}</li>)}</ol>;
    case 'UNORDERED_LIST':
      return <ul style={{ ...prose18, paddingLeft: '26px', marginBottom: '22px' }}>{block.items.map((item, i) => <li key={i} style={{ marginBottom: '6px' }}>{item}</li>)}</ul>;
    case 'IMAGE':
      return (
        <figure style={{ margin: '36px 0' }}>
          <img src={block.url} alt={block.alt ?? ''} style={{ maxWidth: '100%', borderRadius: 'var(--radius)', display: 'block', margin: '0 auto' }} loading="lazy" />
          {block.caption && <figcaption style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-muted)', marginTop: '10px', fontFamily: 'var(--font-ui)' }}>{block.caption}</figcaption>}
        </figure>
      );
    case 'YOUTUBE_EMBED':
      return (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius)', margin: '36px 0' }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${block.videoId}`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Embedded video"
          />
        </div>
      );
    case 'DIVIDER':
      return <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '52px 0' }} />;
    default:
      return null;
  }
}

function blockToText(block: Block): string {
  if ('content' in block) return block.content as string;
  if ('items' in block) return (block.items as string[]).join(' ');
  return '';
}

function CommentsSection({ postSlug, username, comments }: { postSlug: string; username: string; comments: Comment[] }) {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [body, setBody]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/publications/${username}/posts/${postSlug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: name || undefined, authorEmail: email || undefined, body }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputSty: React.CSSProperties = {
    width: '100%', height: '38px', padding: '0 12px',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--color-ink)',
    background: 'var(--color-surface)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <section>
      <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: '15px', fontWeight: 600, marginBottom: '24px', color: 'var(--color-ink)' }}>
        {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comments'}
      </h3>

      {comments.length > 0 && (
        <div style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {comments.map((c, i) => (
            <div key={c.id}>
              {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', fontFamily: 'var(--font-ui)' }}>
                  {c.authorName ?? 'Anonymous'}
                </span>
                <time style={{ fontSize: '12px', color: 'var(--color-faint)', fontFamily: 'var(--font-ui)' }}>
                  {formatDate(c.createdAt)}
                </time>
              </div>
              <p style={{ fontSize: '15px', color: 'var(--color-ink)', margin: 0, fontFamily: 'var(--font-reading)', lineHeight: 1.65 }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {comments.length > 0 && <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: '32px' }} />}

      {submitted ? (
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>
          Your comment is awaiting moderation. Thanks!
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="text" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} style={inputSty} />
            <input type="email" placeholder="Email (optional, private)" value={email} onChange={(e) => setEmail(e.target.value)} style={inputSty} />
          </div>
          <textarea
            placeholder="Add a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={2000}
            rows={4}
            style={{ ...inputSty, height: 'auto', padding: '10px 12px', resize: 'vertical' }}
          />
          {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
          <div>
            <Button type="submit" size="sm" loading={submitting} disabled={!body.trim()}>Post comment</Button>
          </div>
        </form>
      )}
    </section>
  );
}

function NotFoundState({ blogHref }: { blogHref: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '36px', fontWeight: 600, fontFamily: 'var(--font-reading)', color: 'var(--color-ink)', margin: '0 0 8px' }}>404</p>
        <p style={{ fontSize: '15px', color: 'var(--color-muted)', margin: '0 0 24px' }}>This post doesn't exist.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" onClick={() => history.back()}>← Go back</Button>
          <a href={blogHref} style={{ textDecoration: 'none' }}><Button variant="ghost" size="sm">Go to blog</Button></a>
        </div>
      </div>
    </div>
  );
}
