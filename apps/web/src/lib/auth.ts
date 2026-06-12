'use server';

import { cookies } from 'next/headers';

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get('access_token')?.value ?? null;
}

export async function setTokens(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 min
    path: '/',
  });
  store.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearTokens() {
  const store = await cookies();
  store.delete('access_token');
  store.delete('refresh_token');
}
