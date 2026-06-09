import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, Stack, Avatar, Chip } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import { apiClient } from '../../services/api/client';
import { getSocket } from '../../services/socket/socket.client';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { ChatMessage, ChatUser, Conversation, ReplyTarget } from '../../types/chat';
import { getConversationTitle } from '../../utils/chat';
import { MessageItem } from '../../components/chat/MessageItem';
import { MessageInput } from '../../components/chat/MessageInput';
import { MessageInfoDialog } from '../../components/chat/MessageInfoDialog';
import { ForwardDialog } from '../../components/chat/ForwardDialog';

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const user = useSelector((s: RootState) => s.auth.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  const loadMessages = useCallback(() => {
    if (!id) return;
    apiClient.get(`/conversations/${id}/messages`).then((r) => setMessages(r.data.data));
    apiClient.get(`/conversations/${id}/pinned`).then((r) => setPinned(r.data.data));
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
  }, [messages]);

  const members: ChatUser[] = conversation?.members?.map((m) => m.user) ?? [];

  const typingLabel = typingUsers
    .map((uid) => memberMap.current[uid]?.displayName ?? 'Someone')
    .join(', ');

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

  if (!id) return null;

  const title = conversation ? getConversationTitle(conversation, user?.id ?? '') : 'Chat';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', mx: -1 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, px: 1 }}>
        <Avatar sx={{ width: 36, height: 36 }}>{title[0]}</Avatar>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
      </Stack>

      {pinned.length > 0 && (
        <Paper sx={{ p: 1, mb: 1, bgcolor: 'warning.50' }}>
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

      <Paper sx={{ flex: 1, overflow: 'auto', p: 2, mb: 1, bgcolor: 'background.default' }}>
        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            currentUserId={user?.id ?? ''}
            isOwn={m.sender.id === user?.id}
            onReply={setReplyTo}
            onEdit={(msg) => { setEditing(msg); setEditContent(msg.content ?? ''); setReplyTo(null); }}
            onForward={setForwardId}
            onInfo={showInfo}
            onUpdated={loadMessages}
          />
        ))}
        {typingUsers.length > 0 && (
          <Chip size="small" label={`${typingLabel} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`} sx={{ opacity: 0.7 }} />
        )}
        <div ref={bottomRef} />
      </Paper>

      <Box sx={{ px: 1 }}>
        <MessageInput
          conversationId={id}
          members={members}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
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
