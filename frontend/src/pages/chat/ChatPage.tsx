import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, Stack } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import { apiClient } from '../../services/api/client';
import { getSocket } from '../../services/socket/socket.client';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { ChatMessage, ChatUser, Conversation, ReplyTarget } from '../../types/chat';
import { getConversationTitle } from '../../utils/chat';
import { MessageItem } from '../../components/chat/MessageItem';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { MessageInput } from '../../components/chat/MessageInput';
import { MessageInfoDialog } from '../../components/chat/MessageInfoDialog';
import { ForwardDialog } from '../../components/chat/ForwardDialog';
import { PresenceAvatar } from '../../components/presence/PresenceAvatar';
import { PresenceLabel } from '../../components/presence/PresenceLabel';
import { usePresenceHydration } from '../../hooks/usePresenceHydration';

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const user = useSelector((s: RootState) => s.auth.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [pinned, setPinned] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [editContent, setEditContent] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoData, setInfoData] = useState<null | Awaited<ReturnType<typeof loadInfo>>>(null);
  const [forwardId, setForwardId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const memberMap = useRef<Record<string, ChatUser>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const jumpToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightId(null), 2200);
  }, []);

  const loadMessages = useCallback(() => {
    if (!id) return;
    apiClient.get(`/conversations/${id}/messages`)
      .then((r) => {
        setMessages(r.data.data ?? []);
        setLoadError(null);
      })
      .catch((err) => {
        const msg = err.response?.data?.error?.message ?? 'Failed to load messages';
        setLoadError(msg);
        setMessages([]);
      });
    apiClient.get(`/conversations/${id}/pinned`).then((r) => setPinned(r.data.data ?? [])).catch(() => setPinned([]));
  }, [id]);

  const loadConversation = useCallback(() => {
    if (!id) return;
    apiClient.get(`/conversations/${id}`).then((r) => {
      setConversation(r.data.data);
      const map: Record<string, ChatUser> = {};
      r.data.data.members?.forEach((m: { user: ChatUser }) => { map[m.user.id] = m.user; });
      memberMap.current = map;
    });
  }, [id]);

  async function loadInfo(messageId: string) {
    const { data } = await apiClient.get(`/messages/${messageId}/info`);
    return data.data;
  }

  useEffect(() => {
    if (!id || !user) return;
    setMessages([]);
    setLoadError(null);
    loadMessages();
    loadConversation();
    const socket = getSocket();
    socket.emit('channel:join', { conversationId: id });
    socket.emit('conversation:read', { conversationId: id });
    apiClient.post(`/conversations/${id}/read`).catch(() => {});

    const onNew = () => loadMessages();
    const onUpdated = () => loadMessages();
    const onDeleted = () => loadMessages();
    const onTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (data.conversationId !== id || data.userId === user.id) return;
      setTypingUsers((prev) =>
        data.isTyping ? [...new Set([...prev, data.userId])] : prev.filter((u) => u !== data.userId),
      );
    };
    const onRead = () => loadMessages();

    window.addEventListener('message:new', onNew);
    window.addEventListener('message:updated', onUpdated);
    window.addEventListener('message:deleted', onDeleted);
    socket.on('typing:update', onTyping);
    socket.on('message:read_receipt', onRead);

    return () => {
      window.removeEventListener('message:new', onNew);
      window.removeEventListener('message:updated', onUpdated);
      window.removeEventListener('message:deleted', onDeleted);
      socket.off('typing:update', onTyping);
      socket.off('message:read_receipt', onRead);
    };
  }, [id, user, loadMessages, loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const members: ChatUser[] = conversation?.members?.map((m) => m.user) ?? [];

  const saveEdit = async () => {
    if (!editing) return;
    await apiClient.patch(`/messages/${editing.id}`, { content: editContent });
    setEditing(null);
    setEditContent('');
    loadMessages();
    window.dispatchEvent(new CustomEvent('message:updated'));
  };

  const showInfo = async (messageId: string) => {
    const data = await loadInfo(messageId);
    setInfoData(data);
    setInfoOpen(true);
  };

  const otherUser = conversation?.type === 'DIRECT'
    ? conversation.members?.find((m) => m.user.id !== user?.id)?.user
    : null;
  usePresenceHydration(otherUser ? [otherUser.id] : []);

  if (!id) return null;

  const title = conversation ? getConversationTitle(conversation, user?.id ?? '') : 'Chat';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%', height: '100%' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 2,
          py: 1.25,
          flexShrink: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <PresenceAvatar
          userId={otherUser?.id}
          sx={{ width: 36, height: 36 }}
          src={otherUser?.avatarUrl ?? undefined}
        >
          {title[0]}
        </PresenceAvatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700} noWrap>{title}</Typography>
          {otherUser && <PresenceLabel userId={otherUser.id} display="block" />}
        </Box>
      </Stack>

      {pinned.length > 0 && (
        <Paper sx={{ p: 1, mb: 1, mx: 2, bgcolor: 'warning.50', flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <PushPinIcon fontSize="small" color="action" />
            <Typography variant="caption" fontWeight={600}>Pinned</Typography>
          </Stack>
          {pinned.slice(0, 2).map((p) => (
            <Typography key={p.id} variant="body2" noWrap sx={{ opacity: 0.85 }}>
              {p.content ?? 'Attachment'}
            </Typography>
          ))}
        </Paper>
      )}

      <Paper sx={{ flex: 1, overflow: 'auto', px: 2, pt: 2, pb: 2, bgcolor: 'background.default', borderRadius: 0, minHeight: 0, boxShadow: 'none' }}>
        {loadError && (
          <Typography variant="body2" color="error" sx={{ textAlign: 'center', mt: 2 }}>
            {loadError}
          </Typography>
        )}
        {!loadError && messages.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No messages yet. Say hello or attach a file below.
          </Typography>
        )}
        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            currentUserId={user?.id ?? ''}
            isOwn={m.sender.id === user?.id}
            highlighted={highlightId === m.id}
            onReply={setReplyTo}
            onEdit={(msg) => { setEditing(msg); setEditContent(msg.content ?? ''); setReplyTo(null); }}
            onForward={setForwardId}
            onInfo={showInfo}
            onUpdated={loadMessages}
            onJumpToMessage={jumpToMessage}
          />
        ))}
        {typingUsers.map((uid) => {
          const member = memberMap.current[uid];
          if (!member) return null;
          return <TypingIndicator key={uid} user={member} />;
        })}
        <div ref={bottomRef} />
      </Paper>

      <Box sx={{ width: '100%', flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <MessageInput
          conversationId={id}
          members={members}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          onJumpToReply={jumpToMessage}
          onSent={loadMessages}
          editingId={editing?.id ?? null}
          editContent={editContent}
          onEditChange={setEditContent}
          onCancelEdit={() => { setEditing(null); setEditContent(''); }}
          onEditSave={saveEdit}
        />
      </Box>

      <MessageInfoDialog open={infoOpen} info={infoData} onClose={() => setInfoOpen(false)} />
      <ForwardDialog
        open={Boolean(forwardId)}
        messageId={forwardId}
        currentConversationId={id}
        onClose={() => setForwardId(null)}
        onForwarded={loadMessages}
      />
    </Box>
  );
}
