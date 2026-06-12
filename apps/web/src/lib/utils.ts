export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days > 30) return formatDate(dateStr);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function getBlogUrl(slug: string, rootDomain: string): string {
  const [host, port] = rootDomain.split(':');
  const portStr = port ? `:${port}` : '';
  if (host === 'localhost') return `http://${slug}.localhost${portStr}`;
  return `https://${slug}.${host}`;
}

export function getPostUrl(blogSlug: string, postSlug: string, rootDomain: string): string {
  return `${getBlogUrl(blogSlug, rootDomain)}/${postSlug}`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}
