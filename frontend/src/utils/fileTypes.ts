export type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'other';

const VIDEO_EXT = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v', 'mkv']);
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);
const AUDIO_EXT = new Set(['webm', 'mp3', 'm4a', 'ogg', 'wav', 'aac', 'opus']);

export function getPreviewKind(mimeType?: string, filename?: string): PreviewKind {
  const mime = mimeType?.toLowerCase() ?? '';
  const ext = filename?.split('.').pop()?.toLowerCase() ?? '';

  if (mime.startsWith('image/') || IMAGE_EXT.has(ext)) return 'image';
  if (mime.startsWith('audio/') || AUDIO_EXT.has(ext)) return 'audio';
  if (mime.startsWith('video/') || VIDEO_EXT.has(ext)) return 'video';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
