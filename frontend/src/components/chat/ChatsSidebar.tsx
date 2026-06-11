import { useEffect, useMemo, useState } from 'react';
import {
  Box, List, ListItemButton, ListItemAvatar, ListItemText,
  Typography, IconButton, TextField, InputAdornment, Chip, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { apiClient } from '../../services/api/client';
import { getConversationTitle } from '../../utils/chat';
import type { Conversation } from '../../types/chat';
import { NewChatDialog } from './NewChatDialog';
import { PresenceAvatar } from '../presence/PresenceAvatar';
import { usePresenceHydration } from '../../hooks/usePresenceHydration';
import { formatPresenceLabel } from '../../utils/presence';

export function ChatsSidebar() {
  const navigate = useNavigate();
  const { id: activeId } = useParams();
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'starred'>('all');

  const load = () => apiClient.get('/conversations').then((r) => setConversations(r.data.data));

  useEffect(() => {
    load();
    const onMsg = () => load();
    window.addEventListener('message:new', onMsg);
    return () => window.removeEventListener('message:new', onMsg);
  }, []);

  const filtered = useMemo(() => {
    let list = conversations;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter((c) => getConversationTitle(c, userId ?? '').toLowerCase().includes(q));
    }
    const dms = list.filter((c) => c.type === 'DIRECT');
    const rest = list.filter((c) => c.type !== 'DIRECT');
    return [...dms, ...rest];
  }, [conversations, filter, userId]);

  const dmUserIds = useMemo(
    () => filtered
      .filter((c) => c.type === 'DIRECT')
      .map((c) => c.members?.find((m) => m.user.id !== userId)?.user.id)
      .filter((id): id is string => Boolean(id)),
    [filtered, userId],
  );
  usePresenceHydration(dmUserIds);
  const presenceMap = useSelector((s: RootState) => s.presence);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, mb: 1 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>Chats</Typography>
        <IconButton size="small" onClick={() => setNewOpen(true)} title="New chat">
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>

      <TextField
        size="small"
        fullWidth
        placeholder="Search chats..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ px: 1, mb: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
          ),
        }}
      />

      <Stack direction="row" spacing={0.5} sx={{ px: 1, mb: 1 }}>
        <Chip size="small" label="All" variant={tab === 'all' ? 'filled' : 'outlined'} onClick={() => setTab('all')} />
        <Chip size="small" icon={<StarIcon />} label="Starred" variant={tab === 'starred' ? 'filled' : 'outlined'} onClick={() => setTab('starred')} />
      </Stack>

      {tab === 'all' ? (
        <List dense disablePadding>
          {filtered.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
              No chats yet. Tap + to message someone.
            </Typography>
          )}
          {filtered.map((c) => {
            const title = getConversationTitle(c, userId ?? '');
            const preview = c.messages?.[0]?.content;
            const other = c.type === 'DIRECT' ? c.members?.find((m) => m.user.id !== userId)?.user : null;
            const presence = other ? presenceMap[other.id] : undefined;
            const statusLine = other && !preview
              ? formatPresenceLabel(presence?.status, presence?.lastActiveAt)
              : '';
            return (
              <ListItemButton
                key={c.id}
                selected={activeId === c.id}
                onClick={() => navigate(`/chat/${c.id}`)}
                sx={{ borderRadius: 1, mx: 0.5 }}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <PresenceAvatar
                    userId={other?.id}
                    sx={{ width: 32, height: 32 }}
                    src={other?.avatarUrl ?? undefined}
                  >
                    {title[0]}
                  </PresenceAvatar>
                </ListItemAvatar>
                <ListItemText
                  primary={title}
                  secondary={preview ? preview.slice(0, 40) : statusLine || (c.type === 'DIRECT' ? 'Start chatting' : '')}
                  primaryTypographyProps={{ noWrap: true, fontSize: 14, fontWeight: activeId === c.id ? 700 : 500 }}
                  secondaryTypographyProps={{
                    noWrap: true,
                    fontSize: 12,
                    color: !preview && presence?.status === 'online' ? 'success.main' : 'text.secondary',
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      ) : (
        <StarredMessagesList onNavigate={(convId) => navigate(`/chat/${convId}`)} />
      )}

      <NewChatDialog open={newOpen} onClose={() => setNewOpen(false)} onCreated={load} />
    </Box>
  );
}

function StarredMessagesList({ onNavigate }: { onNavigate: (convId: string) => void }) {
  const [items, setItems] = useState<Array<{ message: { id: string; content: string | null; conversation: { id: string; name?: string } }; createdAt: string }>>([]);

  useEffect(() => {
    apiClient.get('/messages/starred').then((r) => setItems(r.data.data));
  }, []);

  if (items.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>No starred messages</Typography>;
  }

  return (
    <List dense>
      {items.map((s) => (
        <ListItemButton key={s.message.id} onClick={() => onNavigate(s.message.conversation.id)}>
          <ListItemText
            primary={s.message.content?.slice(0, 50) ?? 'Attachment'}
            secondary={s.message.conversation.name ?? 'Chat'}
          />
        </ListItemButton>
      ))}
    </List>
  );
}
