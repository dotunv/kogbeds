import { NextRequest, NextResponse } from 'next/server';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

export function proxy(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const hostname = host.split(':')[0] ?? '';
  const rootHostname = ROOT_DOMAIN.split(':')[0] ?? ROOT_DOMAIN;

  const url = req.nextUrl.clone();

  // Strip www
  const effectiveHost = hostname.startsWith('www.')
    ? hostname.slice(4)
    : hostname;

  // Root domain — serve normally (app router handles /)
  if (effectiveHost === rootHostname || effectiveHost === 'localhost') {
    return NextResponse.next();
  }

  // Subdomain blog — rewrite to /blog/[username]
  if (effectiveHost.endsWith(`.${rootHostname}`)) {
    const username = effectiveHost.slice(0, -(rootHostname.length + 1));
    if (username && !username.includes('.')) {
      url.pathname = `/blog/${username}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // Custom domain — rewrite to /site/[domain]
  url.pathname = `/site/${effectiveHost}${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
