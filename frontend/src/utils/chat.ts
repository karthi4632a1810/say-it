import type { ChatMessage, Conversation } from '../types/chat';
import { getPreviewKind } from './fileTypes';

export function getMessagePreviewText(message: {
  content: string | null;
  attachments?: Array<{ file: { originalName: string; mimeType: string } }>;
}): string {
  if (message.content?.trim()) {
    const text = message.content.trim();
    if (isGifUrl(text)) return 'GIF';
    if (/^https?:\/\//i.test(text) && text.length > 60) return 'Link';
    return text;
  }
  const att = message.attachments?.[0];
  if (!att) return 'Attachment';
  const kind = getPreviewKind(att.file.mimeType, att.file.originalName);
  if (kind === 'video') return 'Video';
  if (kind === 'image') return 'Photo';
  if (kind === 'audio') return 'Voice message';
  if (kind === 'pdf' || kind === 'spreadsheet') return att.file.originalName;
  return att.file.originalName;
}

export function getConversationTitle(conv: Conversation, currentUserId: string): string {
  if (conv.name) return conv.name;
  if (conv.type === 'DIRECT') {
    const other = conv.members?.find((m) => m.user.id !== currentUserId)?.user;
    return other?.displayName ?? 'Direct Message';
  }
  return conv.type === 'CHANNEL' ? 'Channel' : 'Group';
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export type ReadTick = 'sent' | 'delivered' | 'read';

export function getReadTick(message: ChatMessage, currentUserId: string): ReadTick | null {
  if (message.sender.id !== currentUserId) return null;
  const others = message.statuses?.filter((s) => s.userId !== currentUserId) ?? [];
  if (others.length === 0) return 'sent';
  if (others.every((s) => s.status === 'READ')) return 'read';
  if (others.every((s) => s.status === 'DELIVERED' || s.status === 'READ')) return 'delivered';
  return 'sent';
}

const GIF_PATTERN = /^https?:\/\/.+\.(gif|webp)(\?.*)?$/i;
const GIPHY_PATTERN = /^https?:\/\/(?:media\d?\.|i\.)?giphy\.com\//i;

export function isGifUrl(text: string): boolean {
  const t = text.trim();
  return GIF_PATTERN.test(t) || GIPHY_PATTERN.test(t);
}

export function isStarredByMe(message: ChatMessage): boolean {
  return (message.stars?.length ?? 0) > 0;
}
