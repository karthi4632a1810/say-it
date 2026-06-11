import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { formatPresenceLabel } from '../utils/presence';

export function usePresenceLabel(userId?: string | null): string {
  const entry = useSelector((s: RootState) => (userId ? s.presence[userId] : undefined));
  const [, tick] = useState(0);

  useEffect(() => {
    if (!userId || entry?.status === 'online') return;
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [userId, entry?.status]);

  if (!userId) return '';
  return formatPresenceLabel(entry?.status, entry?.lastActiveAt);
}
