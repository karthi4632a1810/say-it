/** Browsers only allow mic/camera on HTTPS or localhost. */
export function isMediaSecureContext(): boolean {
  if (typeof window === 'undefined') return true;
  return window.isSecureContext;
}

export function micBlockedReason(): string | null {
  if (typeof window === 'undefined') return null;
  if (isMediaSecureContext()) return null;

  const host = window.location.host;
  return `Microphone needs a secure connection. Open https://${host} on this device (accept the certificate warning), then try again.`;
}

export function httpsAppUrl(): string {
  if (typeof window === 'undefined') return '';
  return `https://${window.location.host}${window.location.pathname}`;
}
