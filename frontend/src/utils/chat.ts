import type { ChatMessage, Conversation } from '../types/chat';

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

export function isGifUrl(text: string): boolean {
  return GIF_PATTERN.test(text.trim());
}

export function isStarredByMe(message: ChatMessage): boolean {
  return (message.stars?.length ?? 0) > 0;
}
