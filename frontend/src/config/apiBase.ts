/**
 * API / Socket.IO base URL.
 * Dev HTTPS → same-origin proxy (mic on mobile + no mixed-content blocks).
 * Production → set VITE_API_URL.
 */
export function getApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (typeof window === 'undefined') return 'http://localhost:3000';

  if (window.location.protocol === 'https:') {
    return '';
  }

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }

  return `http://${hostname}:3000`;
}

export function getSocketUrl(): string | undefined {
  const base = getApiBase();
  return base || undefined;
}
