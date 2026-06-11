import { useState } from 'react';
import {
  Box, Paper, Typography, Avatar, Stack, Chip, IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
} from '@mui/material';
import ReplyIcon from '@mui/icons-material/Reply';
import ForwardIcon from '@mui/icons-material/Forward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PushPinIcon from '@mui/icons-material/PushPin';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { ChatMessage, ReplyTarget } from '../../types/chat';
import { formatMessageTime, getMessagePreviewText, getReadTick, isStarredByMe } from '../../utils/chat';
import { MessageContent, AttachmentPreview } from './MessageContent';
import { ReadTicks } from './ReadTicks';
import { ReplyQuote } from './ReplyQuote';
import { apiClient } from '../../services/api/client';

type Props = {
  message: ChatMessage;
  currentUserId: string;
  isOwn: boolean;
  highlighted?: boolean;
  onReply: (target: ReplyTarget) => void;
  onEdit: (message: ChatMessage) => void;
  onForward: (messageId: string) => void;
  onInfo: (messageId: string) => void;
  onUpdated: () => void;
  onJumpToMessage?: (messageId: string) => void;
};

export function MessageItem({
  message, currentUserId, isOwn, highlighted, onReply, onEdit, onForward, onInfo, onUpdated, onJumpToMessage,
}: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const starred = isStarredByMe(message);
  const tick = isOwn ? getReadTick(message, currentUserId) : null;

  const act = async (fn: () => Promise<unknown>) => {
    setAnchor(null);
    await fn();
    onUpdated();
  };

  return (
    <Box
      id={`msg-${message.id}`}
      sx={{
        mb: 1.5,
        display: 'flex',
        gap: 1,
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        borderRadius: 2.5,
        px: 0.5,
        py: 0.25,
        mx: -0.5,
        transition: 'background-color 0.35s ease, box-shadow 0.35s ease',
        ...(highlighted ? {
          bgcolor: 'rgba(79, 70, 229, 0.14)',
          boxShadow: 'inset 0 0 0 2px rgba(79, 70, 229, 0.45)',
        } : {}),
      }}
    >
      {!isOwn && <Avatar sx={{ width: 32, height: 32 }}>{message.sender.displayName[0]}</Avatar>}
      <Box sx={{ maxWidth: '75%', minWidth: 0, position: 'relative' }}>
        {!isOwn && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            {message.sender.displayName}
          </Typography>
        )}

        <Paper
          sx={{
            p: 1.25,
            bgcolor: isOwn ? 'primary.main' : 'grey.100',
            color: isOwn ? 'white' : 'inherit',
            position: 'relative',
            overflow: 'hidden',
            maxWidth: '100%',
            minWidth: 0,
            width: 'fit-content',
          }}
        >
          {message.parent && (
            <ReplyQuote
              senderName={message.parent.sender.displayName}
              preview={getMessagePreviewText(message.parent)}
              isOwnBubble={isOwn}
              onClick={onJumpToMessage ? () => onJumpToMessage(message.parent!.id) : undefined}
            />
          )}
          {message.isPinned && (
            <PushPinIcon sx={{ fontSize: 14, position: 'absolute', top: 4, right: 4, opacity: 0.7 }} />
          )}
          {message.isDeleted ? (
            <Typography variant="body2" fontStyle="italic" sx={{ opacity: 0.8 }}>Message deleted</Typography>
          ) : (
            <>
              {message.content && <MessageContent content={message.content} />}
              {message.attachments?.map((a) => (
                <AttachmentPreview key={a.id} fileId={a.file.id} name={a.file.originalName} mimeType={a.file.mimeType} isOwn={isOwn} />
              ))}
            </>
          )}

          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5} sx={{ mt: 0.5 }}>
            {starred && <StarIcon sx={{ fontSize: 12, color: isOwn ? 'rgba(255,255,255,0.8)' : 'warning.main' }} />}
            {message.isEdited && (
              <Typography variant="caption" sx={{ opacity: 0.75, fontSize: 10 }}>edited</Typography>
            )}
            <Typography variant="caption" sx={{ opacity: 0.75, fontSize: 10 }}>
              {formatMessageTime(message.createdAt)}
            </Typography>
            {tick && <ReadTicks status={tick} />}
          </Stack>
        </Paper>

        {message.reactions?.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
            {message.reactions.map((r, i) => (
              <Chip key={i} size="small" label={`${r.emoji}`} sx={{ height: 22, fontSize: 12 }} />
            ))}
          </Stack>
        )}

        {!message.isDeleted && (
          <IconButton size="small" sx={{ position: 'absolute', top: 4, [isOwn ? 'left' : 'right']: -28 }} onClick={(e) => setAnchor(e.currentTarget)}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}

        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          <MenuItem onClick={() => {
            setAnchor(null);
            onReply({
              id: message.id,
              content: getMessagePreviewText(message),
              senderName: message.sender.displayName,
            });
          }}>
            <ListItemIcon><ReplyIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Reply</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setAnchor(null); onForward(message.id); }}>
            <ListItemIcon><ForwardIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Forward</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => act(async () => navigator.clipboard.writeText(message.content ?? ''))}>
            <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Copy</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => act(() => starred ? apiClient.delete(`/messages/${message.id}/star`) : apiClient.post(`/messages/${message.id}/star`))}>
            <ListItemIcon>{starred ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}</ListItemIcon>
            <ListItemText>{starred ? 'Unstar' : 'Star'}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => act(() => message.isPinned ? apiClient.delete(`/messages/${message.id}/pin`) : apiClient.post(`/messages/${message.id}/pin`))}>
            <ListItemIcon><PushPinIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{message.isPinned ? 'Unpin' : 'Pin'}</ListItemText>
          </MenuItem>
          {isOwn && (
            <MenuItem onClick={() => { setAnchor(null); onEdit(message); }}>
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
          )}
          <MenuItem onClick={() => { setAnchor(null); onInfo(message.id); }}>
            <ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Info</ListItemText>
          </MenuItem>
          {isOwn && (
            <MenuItem onClick={() => act(() => apiClient.delete(`/messages/${message.id}`))}>
              <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </Box>
    </Box>
  );
}
