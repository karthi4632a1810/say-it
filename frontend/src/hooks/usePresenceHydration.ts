import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { apiClient } from '../services/api/client';
import { setBulkPresence } from '../store/slices/presenceSlice';

export function usePresenceHydration(userIds: string[]) {
  const dispatch = useDispatch();
  const key = useMemo(
    () => [...new Set(userIds.filter(Boolean))].sort().join(','),
    [userIds],
  );

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) return;
    apiClient.post('/users/presence/bulk', { userIds: ids })
      .then((r) => dispatch(setBulkPresence(r.data.data ?? [])))
      .catch(() => {});
  }, [key, dispatch]);
}
