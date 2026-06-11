import { useRef, useState } from 'react';
import {
  Box, TextField, IconButton, Stack, Popover, Paper, Typography,
  Button, Alert, CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import GifBoxIcon from '@mui/icons-material/GifBox';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { ReplyTarget, ChatUser } from '../../types/chat';
import { apiClient } from '../../services/api/client';
import {
  PendingAttachmentPreview,
  createPendingFromFile,
  revokePendingPreview,
  type PendingAttachment,
} from './PendingAttachmentPreview';
import { ReplyQuote } from './ReplyQuote';
import { GifPickerDialog } from './GifPickerDialog';
import type { GiphyGif } from '../../services/giphy/giphy.client';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { formatRecordTime } from '../../utils/audioRecord';

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😎', '🤩', '🥳',
  '😢', '😭', '😤', '😡', '🤔', '😴', '🤗', '🙄', '😬', '🤐', '👍', '👎', '👏', '🙌', '🤝', '👋',
  '💪', '🙏', '❤️', '🧡', '💛', '💚', '💙', '💜', '🔥', '✨', '💯', '🎉', '🎊', '⭐', '✅', '❌',
];

type Props = {
  conversationId: string;
  members: ChatUser[];
  replyTo: ReplyTarget | null;
  onClearReply: () => void;
  onJumpToReply?: (messageId: string) => void;
  onSent: () => void;
  editingId: string | null;
  editContent: string;
  onEditChange: (v: string) => void;
  onCancelEdit: () => void;
  onEditSave: () => void;
};

export function MessageInput({
  conversationId, members, replyTo, onClearReply, onJumpToReply, onSent,
  editingId, editContent, onEditChange, onCancelEdit, onEditSave,
}: Props) {
  const [input, setInput] = useState('');
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifSending, setGifSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [audioSending, setAudioSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadGenRef = useRef<Record<string, number>>({});
  const { isRecording, seconds: recordSeconds, start: startRecording, stop: stopRecording, cancel: cancelRecording } = useVoiceRecorder();

  const uploadingCount = pendingFiles.filter((f) => f.status === 'uploading').length;
  const readyFiles = pendingFiles.filter((f) => f.status === 'ready' && f.serverId);

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

  const insertEmoji = (emoji: string) => {
    if (editingId) onEditChange(editContent + emoji);
    else setInput((i) => i + emoji);
  };

  const insertMention = (username: string) => {
    const val = editingId ? editContent : input;
    const next = val.replace(/@\w*$/, `@${username} `);
    if (editingId) onEditChange(next);
    else setInput(next);
    setMentionQuery(null);
  };

  const clearPendingFiles = () => {
    pendingFiles.forEach(revokePendingPreview);
    setPendingFiles([]);
  };

  const send = async () => {
    if (editingId) {
      onEditSave();
      return;
    }
    const text = input.trim();
    const fileIds = readyFiles.map((f) => f.serverId!);
    if (!text && fileIds.length === 0) return;
    if (uploadingCount > 0) {
      setUploadError('Wait for uploads to finish before sending');
      return;
    }

    setInput('');
    clearPendingFiles();
    onClearReply();
    emitTyping(false);

    try {
      if (fileIds.length > 0) {
        await apiClient.post(`/conversations/${conversationId}/messages`, {
          content: text || undefined,
          parentMessageId: replyTo?.id,
          fileIds,
        });
        window.dispatchEvent(new CustomEvent('message:new'));
      } else {
        const { getSocket } = await import('../../services/socket/socket.client');
        getSocket().emit('message:send', {
          conversationId,
          content: text,
          parentMessageId: replyTo?.id,
        });
        window.dispatchEvent(new CustomEvent('message:new'));
      }
      onSent();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setUploadError(msg ?? 'Failed to send message');
      if (text) setInput(text);
    }
  };

  const uploadFile = async (file: File, localKey: string) => {
    const gen = (uploadGenRef.current[localKey] ?? 0) + 1;
    uploadGenRef.current[localKey] = gen;
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('conversationId', conversationId);
      const { data } = await apiClient.post('/files/upload', form, { timeout: 0 });
      if (uploadGenRef.current[localKey] !== gen) return;
      const uploaded = data.data as { id: string; originalName: string };
      setPendingFiles((prev) =>
        prev.map((p) =>
          p.localKey === localKey
            ? { ...p, serverId: uploaded.id, name: uploaded.originalName || p.name, status: 'ready' as const }
            : p,
        ),
      );
    } catch (err: unknown) {
      if (uploadGenRef.current[localKey] !== gen) return;
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setUploadError(msg ?? 'File upload failed. Is MinIO running? (docker compose up -d)');
      setPendingFiles((prev) =>
        prev.map((p) => (p.localKey === localKey ? { ...p, status: 'error' as const } : p)),
      );
    }
  };

  const onFilesSelected = (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    Array.from(files).forEach((file) => {
      const pending = createPendingFromFile(file);
      setPendingFiles((prev) => [...prev, pending]);
      uploadFile(file, pending.localKey);
    });
  };

  const removePendingFile = (localKey: string) => {
    uploadGenRef.current[localKey] = (uploadGenRef.current[localKey] ?? 0) + 1;
    setPendingFiles((prev) => {
      const item = prev.find((f) => f.localKey === localKey);
      if (item) revokePendingPreview(item);
      return prev.filter((f) => f.localKey !== localKey);
    });
  };

  const handleAttachmentEdited = (localKey: string, file: File) => {
    uploadGenRef.current[localKey] = (uploadGenRef.current[localKey] ?? 0) + 1;
    setUploadError(null);
    setPendingFiles((prev) =>
      prev.map((p) => {
        if (p.localKey !== localKey) return p;
        revokePendingPreview(p);
        return {
          ...p,
          previewUrl: URL.createObjectURL(file),
          sizeBytes: file.size,
          mimeType: file.type || p.mimeType,
          name: file.name,
          status: 'uploading' as const,
          serverId: undefined,
          sourceFile: file,
        };
      }),
    );
    uploadFile(file, localKey);
  };

  const sendGif = async (gif: GiphyGif) => {
    setGifSending(true);
    setUploadError(null);
    try {
      const { data } = await apiClient.post('/files/import-giphy', {
        url: gif.sendUrl,
        giphyId: gif.id,
        title: gif.title,
        conversationId,
      });
      const fileId = (data.data as { id: string }).id;
      await apiClient.post(`/conversations/${conversationId}/messages`, {
        parentMessageId: replyTo?.id,
        fileIds: [fileId],
      });
      window.dispatchEvent(new CustomEvent('message:new'));
      setGifOpen(false);
      onClearReply();
      onSent();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setUploadError(msg ?? 'Failed to save GIF to storage');
    } finally {
      setGifSending(false);
    }
  };

  const sendAudioFile = async (file: File) => {
    setAudioSending(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('conversationId', conversationId);
      const { data } = await apiClient.post('/files/upload', form, { timeout: 0 });
      const fileId = (data.data as { id: string }).id;
      await apiClient.post(`/conversations/${conversationId}/messages`, {
        parentMessageId: replyTo?.id,
        fileIds: [fileId],
      });
      window.dispatchEvent(new CustomEvent('message:new'));
      onClearReply();
      onSent();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setUploadError(msg ?? 'Failed to send voice message');
    } finally {
      setAudioSending(false);
    }
  };

  const toggleVoiceRecording = async () => {
    if (audioSending || uploadingCount > 0 || editingId) return;
    if (isRecording) {
      const file = await stopRecording();
      if (file) await sendAudioFile(file);
      return;
    }
    setUploadError(null);
    const ok = await startRecording();
    if (!ok) {
      setUploadError('Microphone access denied or not supported in this browser');
    }
  };

  const mentionUsers = mentionQuery !== null
    ? members.filter((m) => m.username?.toLowerCase().includes(mentionQuery.toLowerCase()) || m.displayName.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  const displayValue = editingId ? editContent : input;
  const sendDisabled = uploadingCount > 0 || audioSending;
  const inputDisabled = sendDisabled || isRecording;

  return (
    <Box sx={{ width: '100%' }}>
      {replyTo && !editingId && (
        <Paper sx={{ p: 1, mx: 2, mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ReplyQuote
              senderName={replyTo.senderName}
              preview={replyTo.content ?? 'Attachment'}
              compact
              onClick={onJumpToReply ? () => onJumpToReply(replyTo.id) : undefined}
            />
          </Box>
          <IconButton size="small" onClick={onClearReply} title="Cancel reply" sx={{ flexShrink: 0 }}><CloseIcon fontSize="small" /></IconButton>
        </Paper>
      )}

      {editingId && (
        <Paper sx={{ p: 1, mx: 2, mt: 1.5, bgcolor: 'warning.50' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" fontWeight={600}>Editing message</Typography>
            <IconButton size="small" onClick={onCancelEdit}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </Paper>
      )}

      {uploadError && (
        <Alert severity="error" sx={{ mx: 2, mt: 1.5 }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}

      {pendingFiles.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mx: 2,
            mt: 1.5,
            p: 1.5,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
            {uploadingCount > 0 ? (
              <>
                <CloudUploadIcon color="primary" fontSize="small" />
                <Typography variant="body2" fontWeight={600} color="primary.main">
                  Uploading {uploadingCount} file{uploadingCount > 1 ? 's' : ''}…
                </Typography>
                <CircularProgress size={14} sx={{ ml: 'auto' }} />
              </>
            ) : (
              <>
                <CheckCircleOutlineIcon color="success" fontSize="small" />
                <Typography variant="body2" fontWeight={600}>
                  Ready to send
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  Edit photos & videos · tap to expand
                </Typography>
              </>
            )}
          </Stack>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              overflowX: 'auto',
              pb: 0.5,
              mx: -0.5,
              px: 0.5,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 3 },
            }}
          >
            {pendingFiles.map((f) => (
              <PendingAttachmentPreview
                key={f.localKey}
                name={f.name}
                mimeType={f.mimeType}
                previewUrl={f.previewUrl}
                sizeBytes={f.sizeBytes}
                status={f.status}
                onRemove={() => removePendingFile(f.localKey)}
                onImageEdited={(file) => handleAttachmentEdited(f.localKey, file)}
                onVideoEdited={(file) => handleAttachmentEdited(f.localKey, file)}
                sourceFile={f.sourceFile}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {isRecording && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: 2, py: 1, bgcolor: 'error.50', borderTop: '1px solid', borderColor: 'error.light' }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'error.main',
              animation: 'pulse 1.2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                '50%': { opacity: 0.5, transform: 'scale(0.85)' },
              },
            }}
          />
          <Typography variant="body2" fontWeight={600} color="error.main" sx={{ flex: 1 }}>
            Recording {formatRecordTime(recordSeconds)}
          </Typography>
          <Button size="small" color="inherit" onClick={cancelRecording}>Cancel</Button>
        </Stack>
      )}

      <Paper
        elevation={0}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          px: 1.5,
          py: 1,
          bgcolor: 'background.paper',
        }}
      >
      <Stack direction="row" spacing={0.5} alignItems="flex-end">
        <IconButton onClick={(e) => setEmojiAnchor(e.currentTarget)} disabled={inputDisabled}>
          <EmojiEmotionsIcon />
        </IconButton>
        <IconButton onClick={() => setGifOpen(true)} disabled={inputDisabled}><GifBoxIcon /></IconButton>
        <IconButton onClick={() => fileRef.current?.click()} disabled={inputDisabled}>
          <AttachFileIcon />
        </IconButton>
        <input
          ref={fileRef}
          type="file"
          hidden
          multiple
          onChange={(e) => { onFilesSelected(e.target.files); e.target.value = ''; }}
        />
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          placeholder={editingId ? 'Edit message...' : 'Type a message... Use @ to mention'}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          disabled={isRecording}
        />
        <IconButton
          onClick={toggleVoiceRecording}
          disabled={Boolean(editingId) || audioSending || uploadingCount > 0}
          title={isRecording ? 'Stop and send voice message' : 'Record voice message'}
          sx={{
            color: isRecording ? 'error.main' : 'text.secondary',
            bgcolor: isRecording ? 'error.50' : 'transparent',
            '&:hover': { bgcolor: isRecording ? 'error.100' : 'action.hover' },
          }}
        >
          {audioSending ? <CircularProgress size={22} /> : isRecording ? <StopIcon /> : <MicIcon />}
        </IconButton>
        <IconButton color="primary" onClick={send} disabled={sendDisabled || isRecording}>
          {sendDisabled ? <CircularProgress size={22} /> : <SendIcon />}
        </IconButton>
      </Stack>
      </Paper>

      {mentionUsers.length > 0 && (
        <Paper sx={{ mx: 2, mt: 1, maxHeight: 120, overflow: 'auto' }}>
          {mentionUsers.map((m) => (
            <Box key={m.id} sx={{ px: 2, py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => insertMention(m.username ?? m.displayName)}>
              <Typography variant="body2">@{m.username ?? m.displayName}</Typography>
            </Box>
          ))}
        </Paper>
      )}

      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        disableRestoreFocus
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, maxWidth: 280 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
            {EMOJIS.map((e) => (
              <IconButton
                key={e}
                size="small"
                sx={{ fontSize: 20, width: 36, height: 36 }}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => insertEmoji(e)}
              >
                {e}
              </IconButton>
            ))}
          </Box>
          <Button size="small" fullWidth sx={{ mt: 0.5 }} onClick={() => setEmojiAnchor(null)}>
            Done
          </Button>
        </Box>
      </Popover>

      <GifPickerDialog
        open={gifOpen}
        onClose={() => !gifSending && setGifOpen(false)}
        onSelect={sendGif}
        sending={gifSending}
      />
    </Box>
  );
}
