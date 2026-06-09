import { useRef, useState } from 'react';
import {
  Box, TextField, IconButton, Stack, Popover, Paper, Typography, Dialog,
  DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import GifBoxIcon from '@mui/icons-material/GifBox';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import type { ReplyTarget, ChatUser } from '../../types/chat';
import { apiClient } from '../../services/api/client';

const EMOJIS = ['😀', '😂', '❤️', '👍', '🔥', '🎉', '😊', '🙏', '💯', '✨', '😢', '🤔', '👋', '💪', '😎'];

type Props = {
  conversationId: string;
  members: ChatUser[];
  replyTo: ReplyTarget | null;
  onClearReply: () => void;
  onSent: () => void;
  editingId: string | null;
  editContent: string;
  onEditChange: (v: string) => void;
  onCancelEdit: () => void;
  onEditSave: () => void;
};

export function MessageInput({
  conversationId, members, replyTo, onClearReply, onSent,
  editingId, editContent, onEditChange, onCancelEdit, onEditSave,
}: Props) {
  const [input, setInput] = useState('');
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifUrl, setGifUrl] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitTyping = (start: boolean) => {
    import('../../services/socket/socket.client').then(({ getSocket }) => {
      const socket = getSocket();
      socket.emit(start ? 'message:typing:start' : 'message:typing:stop', { conversationId });
    });
  };

  const onChange = (val: string) => {
    if (editingId) {
      onEditChange(val);
      return;
    }
    setInput(val);
    emitTyping(true);
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => emitTyping(false), 2000);

    const atMatch = val.match(/@(\w*)$/);
    setMentionQuery(atMatch ? (atMatch[1] ?? '') : null);
  };

  const insertMention = (username: string) => {
    const val = editingId ? editContent : input;
    const next = val.replace(/@\w*$/, `@${username} `);
    if (editingId) onEditChange(next);
    else setInput(next);
    setMentionQuery(null);
  };

  const send = async () => {
    if (editingId) {
      onEditSave();
      return;
    }
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;

    const { getSocket } = await import('../../services/socket/socket.client');
    const socket = getSocket();
    socket.emit('message:send', {
      conversationId,
      content: text || undefined,
      parentMessageId: replyTo?.id,
      fileIds: pendingFiles.length ? pendingFiles : undefined,
    });
    setInput('');
    setPendingFiles([]);
    onClearReply();
    emitTyping(false);
    onSent();
  };

  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('conversationId', conversationId);
    const { data } = await apiClient.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setPendingFiles((p) => [...p, data.data.id]);
  };

  const sendGif = async () => {
    if (!gifUrl.trim()) return;
    const { getSocket } = await import('../../services/socket/socket.client');
    getSocket().emit('message:send', { conversationId, content: gifUrl.trim() });
    setGifUrl('');
    setGifOpen(false);
    onSent();
  };

  const mentionUsers = mentionQuery !== null
    ? members.filter((m) => m.username?.toLowerCase().includes(mentionQuery.toLowerCase()) || m.displayName.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  const displayValue = editingId ? editContent : input;

  return (
    <Box>
      {replyTo && !editingId && (
        <Paper sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', bgcolor: 'grey.50' }}>
          <Box sx={{ flex: 1, borderLeft: 3, borderColor: 'primary.main', pl: 1 }}>
            <Typography variant="caption" fontWeight={600}>Reply to {replyTo.senderName}</Typography>
            <Typography variant="caption" display="block" noWrap>{replyTo.content}</Typography>
          </Box>
          <IconButton size="small" onClick={onClearReply}><CloseIcon fontSize="small" /></IconButton>
        </Paper>
      )}

      {editingId && (
        <Paper sx={{ p: 1, mb: 1, bgcolor: 'warning.50' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" fontWeight={600}>Editing message</Typography>
            <IconButton size="small" onClick={onCancelEdit}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </Paper>
      )}

      {pendingFiles.length > 0 && (
        <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>
          {pendingFiles.length} file(s) attached
        </Typography>
      )}

      {mentionUsers.length > 0 && (
        <Paper sx={{ mb: 1, maxHeight: 120, overflow: 'auto' }}>
          {mentionUsers.map((m) => (
            <Box key={m.id} sx={{ px: 2, py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => insertMention(m.username ?? m.displayName)}>
              <Typography variant="body2">@{m.username ?? m.displayName}</Typography>
            </Box>
          ))}
        </Paper>
      )}

      <Stack direction="row" spacing={0.5} alignItems="flex-end">
        <IconButton onClick={(e) => setEmojiAnchor(e.currentTarget)}><EmojiEmotionsIcon /></IconButton>
        <IconButton onClick={() => setGifOpen(true)}><GifBoxIcon /></IconButton>
        <IconButton onClick={() => fileRef.current?.click()}><AttachFileIcon /></IconButton>
        <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          placeholder={editingId ? 'Edit message...' : 'Type a message... Use @ to mention'}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
        />
        <IconButton color="primary" onClick={send}><SendIcon /></IconButton>
      </Stack>

      <Popover open={Boolean(emojiAnchor)} anchorEl={emojiAnchor} onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }} transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 240 }}>
          {EMOJIS.map((e) => (
            <IconButton key={e} size="small" onClick={() => {
              if (editingId) onEditChange(editContent + e);
              else setInput((i) => i + e);
              setEmojiAnchor(null);
            }}>{e}</IconButton>
          ))}
        </Box>
      </Popover>

      <Dialog open={gifOpen} onClose={() => setGifOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Send a GIF</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="GIF URL" value={gifUrl} onChange={(e) => setGifUrl(e.target.value)}
            placeholder="https://example.com/image.gif" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGifOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={sendGif}>Send</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
