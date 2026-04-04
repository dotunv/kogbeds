/**
 * Returns a safe http(s) URL string for use in content, or null if invalid.
 */
export const sanitizeContentUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      return null;
    }
    if (u.username !== '' || u.password !== '') {
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
};
