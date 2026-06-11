export type PresenceEntry = {
  status: string;
  lastActiveAt: string | null;
};

export function isUserOnline(status?: string): boolean {
  return status === 'online' || status === 'away' || status === 'busy';
}

export function formatPresenceLabel(status?: string, lastActiveAt?: string | null): string {
  if (status === 'online') return 'Online';
  if (status === 'away') return 'Away';
  if (status === 'busy') return 'Busy';
  if (!lastActiveAt) return 'Offline';

  const then = new Date(lastActiveAt);
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));

  if (diffSec < 60) return 'Last seen just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Last seen ${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Last seen ${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Last seen yesterday';
  if (diffDay < 7) return `Last seen ${diffDay}d ago`;
  return `Last seen ${then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export function presenceDotColor(status?: string): string | null {
  if (status === 'online') return '#22c55e';
  if (status === 'away') return '#f59e0b';
  if (status === 'busy') return '#ef4444';
  return null;
}
