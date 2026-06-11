import { useEffect, useState } from 'react';
import { apiClient } from '../services/api/client';

/** Fetch file bytes once and expose a blob object URL (revoked on unmount). */
export function useFileBlob(fileId: string | null, enabled = true) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId || !enabled) return;

    let objectUrl: string | null = null;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get(`/files/${fileId}/content`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setBlob(res.data);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load file');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setBlobUrl(null);
      setBlob(null);
    };
  }, [fileId, enabled]);

  return { blobUrl, blob, loading, error };
}

export async function downloadFileBlob(fileId: string, filename: string): Promise<void> {
  const { data } = await apiClient.get(`/files/${fileId}/content`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
