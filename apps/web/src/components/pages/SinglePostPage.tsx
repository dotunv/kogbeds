'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Blog, Post, Comment, Block } from '@/lib/types';
import { PostReadingBar } from '@/components/blog/PostReadingBar';
import { SubscribeBar } from '@/components/blog/SubscribeBar';
import { Button } from '@/components/ui/Button';
import { formatDate, readingTime, getBlogUrl } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

type Props = { username: string; slug: string };

export function SinglePostPage({ username, slug }: Props) {
  const [blog, setBlog]       = useState<Blog | null>(null);
  const [post, setPost]       = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notFound, setNotFound] = useState(false);

  const blogHref = getBlogUrl(username, ROOT_DOMAIN);

  useEffect(() => {
    Promise.all([
      api.get<Blog>(`/blogs/${username}`),
      fetch(`${API}/posts/${slug}`, { headers: { 'x-blog-slug': username } }).then((r) => r.json()).then((r) => r.data),
    ])
      .then(([b, p]) => { setBlog(b); setPost(p); })
      .catch(() => setNotFound(true));

    fetch(`${API}/posts/${slug}/comments`, { headers: { 'x-blog-slug': username } })
      .then((r) => r.json())
      .then((r) => setComments(r.data ?? []));

    // Track view (fire and forget)
    fetch(`${API}/analytics/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-blog-slug': username },
      body: JSON.stringify({ postSlug: slug }),
    }).catch(() => {});
  }, [username, slug]);

  if (notFound) return <NotFoundState blogHref={blogHref} />;
  if (!blog || !post) return null;

  const accentColor = blog.accentColor ?? '#2D6BE4';
  const plainText   = post.markdownContent ?? (post.blocks ?? []).map(blockToText).join(' ');
  const mins        = readingTime(plainText);

  return (
    <div style={{ background: 'var(--color-canvas)', minHeight: '100vh' }}>
      <PostReadingBar blogTitle={blog.title || username} blogHref={blogHref} accentColor={accentColor} />

      <main style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <article
          style={{
            maxWidth: 'var(--max-content)',
            margin: '0 auto',
            padding: '0 24px',
          }}
        >
          {/* Post header */}
          <header style={{ marginBottom: '40px' }}>
            <h1
              style={{
                fontFamily: 'var(--font-reading)',
                fontSize: '36px',
                fontWeight: 600,
                lineHeight: 1.15,
                color: 'var(--color-ink)',
                marginBottom: '16px',
              }}
            >
              {post.title}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>
              {post.publishedAt ? formatDate(post.publishedAt) : ''} · {mins} min read
              {post.tags.length > 0 && (
                <> · {post.tags.map((t) => `#${t.name}`).join(' ')}</>
              )}
            </p>
          </header>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: '40px' }} />

          {/* Post content */}
          <div className="prose">
            {post.format === 'MARKDOWN' && post.markdownContent
              ? <MarkdownContent content={post.markdownContent} />
              : <BlocksContent blocks={post.blocks ?? []} accentColor={accentColor} />
            }
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '48px 0' }} />

          <Link href={blogHref} style={{ fontSize: '14px', color: 'var(--color-muted)', textDecoration: 'none', fontFamily: 'var(--font-ui)' }}>
            ← All posts
          </Link>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '48px 0' }} />

          {/* Comments */}
          <CommentsSection postSlug={slug} username={username} comments={comments} />

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '48px 0' }} />

          <SubscribeBar blogId={blog.id} username={username} accentColor={accentColor} />
        </article>
      </main>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  // Server renders markdown — for client we display raw text as a placeholder
  // In production this would use a markdown renderer like marked or remark
  return (
    <div
      style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-reading)', fontSize: '18px', lineHeight: 1.8, color: 'var(--color-ink)' }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

function BlocksContent({ blocks, accentColor }: { blocks: Block[]; accentColor: string }) {
  return (
    <div>
      {blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} accentColor={accentColor} />
      ))}
    </div>
  );
}

function BlockRenderer({ block, accentColor }: { block: Block; accentColor: string }) {
  switch (block.type) {
    case 'PARAGRAPH':
      return <p style={{ marginBottom: '24px', fontFamily: 'var(--font-reading)', fontSize: '18px', lineHeight: 1.8 }}>{block.content}</p>;
    case 'HEADING_1':
      return <h1 style={{ fontSize: '30px', fontWeight: 600, marginTop: '48px', marginBottom: '16px', fontFamily: 'var(--font-reading)' }}>{block.content}</h1>;
    case 'HEADING_2':
      return <h2 style={{ fontSize: '24px', fontWeight: 600, marginTop: '40px', marginBottom: '14px', fontFamily: 'var(--font-reading)' }}>{block.content}</h2>;
    case 'HEADING_3':
      return <h3 style={{ fontSize: '20px', fontWeight: 600, marginTop: '32px', marginBottom: '12px', fontFamily: 'var(--font-reading)' }}>{block.content}</h3>;
    case 'BLOCKQUOTE':
      return (
        <blockquote style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: '20px', color: 'var(--color-muted)', fontStyle: 'italic', margin: '24px 0', fontFamily: 'var(--font-reading)', fontSize: '18px' }}>
          {block.content}
        </blockquote>
      );
    case 'CODE':
      return (
        <pre style={{ fontFamily: 'var(--font-code)', fontSize: '14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '20px 24px', overflowX: 'auto', lineHeight: 1.6, margin: '24px 0' }}>
          <code>{block.content}</code>
        </pre>
      );
    case 'ORDERED_LIST':
      return <ol style={{ paddingLeft: '24px', marginBottom: '24px', fontFamily: 'var(--font-reading)', fontSize: '18px' }}>{block.items.map((item, i) => <li key={i} style={{ marginBottom: '8px' }}>{item}</li>)}</ol>;
    case 'UNORDERED_LIST':
      return <ul style={{ paddingLeft: '24px', marginBottom: '24px', fontFamily: 'var(--font-reading)', fontSize: '18px' }}>{block.items.map((item, i) => <li key={i} style={{ marginBottom: '8px' }}>{item}</li>)}</ul>;
    case 'IMAGE':
      return (
        <figure style={{ margin: '32px 0' }}>
          <img src={block.url} alt={block.alt ?? ''} style={{ maxWidth: '100%', borderRadius: 'var(--radius)', display: 'block', margin: '0 auto' }} loading="lazy" />
          {block.caption && <figcaption style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-muted)', marginTop: '8px' }}>{block.caption}</figcaption>}
        </figure>
      );
    case 'YOUTUBE_EMBED':
      return (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius)', margin: '32px 0' }}>
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
      return <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '48px 0' }} />;
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
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [body, setBody]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]   = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/posts/${postSlug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-blog-slug': username },
        body: JSON.stringify({ authorName: name || undefined, authorEmail: email || undefined, body }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError('Failed to submit comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 600, marginBottom: '24px', color: 'var(--color-ink)' }}>
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {comments.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '32px' }}>No comments yet.</p>
      ) : (
        <div style={{ marginBottom: '40px' }}>
          {comments.map((c, i) => (
            <div key={c.id}>
              {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', fontFamily: 'var(--font-ui)' }}>
                    {c.authorName ?? 'Anonymous'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>
                    {formatDate(c.createdAt)}
                  </span>
                </div>
                <p style={{ fontSize: '15px', color: 'var(--color-ink)', margin: 0, fontFamily: 'var(--font-reading)', lineHeight: 1.6 }}>
                  {c.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h4 style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-ink)' }}>
          Leave a comment
        </h4>
        {submitted ? (
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>
            Your comment is awaiting moderation.
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ flex: 1, height: '38px', padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--color-ink)', background: 'var(--color-surface)' }}
              />
              <input
                type="email"
                placeholder="Email (optional, not shown publicly)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ flex: 1, height: '38px', padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--color-ink)', background: 'var(--color-surface)' }}
              />
            </div>
            <textarea
              placeholder="Comment…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={2000}
              rows={4}
              style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--color-ink)', background: 'var(--color-surface)', resize: 'vertical' }}
            />
            {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{error}</p>}
            <div>
              <Button type="submit" loading={submitting}>Post comment</Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function NotFoundState({ blogHref }: { blogHref: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '48px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>404</p>
        <p style={{ fontSize: '16px', color: 'var(--color-muted)', marginBottom: '24px' }}>This page doesn't exist.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button variant="ghost" onClick={() => history.back()}>← Go back</Button>
          <a href={blogHref} style={{ textDecoration: 'none' }}><Button variant="ghost">Go to blog</Button></a>
        </div>
      </div>
    </div>
  );
}
