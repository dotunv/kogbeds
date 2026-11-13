'use client';

import { useCallback } from 'react';

/**
 * Shared hook for accessing the access token.
 * Centralizes token retrieval for consistent auth header construction.
 */
export function useToken() {
  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('access_token') ?? '';
  }, []);

  const clearToken = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('grizzly_username');
  }, []);

  return { getToken, clearToken };
}
