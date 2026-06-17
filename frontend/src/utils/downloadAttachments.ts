import JSZip from 'jszip';
import { apiClient } from '../services/api/client';
import { downloadFileBlob } from '../hooks/useFileBlob';

export type AttachmentFile = {
  id: string;
  originalName: string;
};

function uniqueZipName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let i = 2;
  while (used.has(`${base} (${i})${ext}`)) i++;
  const unique = `${base} (${i})${ext}`;
  used.add(unique);
  return unique;
}

export async function downloadMessageAttachments(files: AttachmentFile[]): Promise<void> {
  if (files.length === 0) return;

  if (files.length === 1) {
    const file = files[0]!;
    await downloadFileBlob(file.id, file.originalName);
    return;
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();

  await Promise.all(
    files.map(async (file) => {
      const { data } = await apiClient.get(`/files/${file.id}/content`, { responseType: 'blob' });
      zip.file(uniqueZipName(file.originalName, usedNames), data);
    }),
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attachments-${Date.now()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export function attachmentZipLabel(count: number): string {
  return count > 1 ? 'Download all' : 'Download';
}
