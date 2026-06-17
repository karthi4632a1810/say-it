import { useEffect, useMemo, useState } from 'react';

import {

  Box, List, ListItemButton, ListItemAvatar, ListItemText,

  Typography, IconButton, TextField, InputAdornment, Chip, Stack,

} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';

import SearchIcon from '@mui/icons-material/Search';

import StarIcon from '@mui/icons-material/Star';

import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '../../store';

import { apiClient } from '../../services/api/client';

import { getConversationTitle } from '../../utils/chat';

import type { Conversation } from '../../types/chat';

import { NewChatDialog } from './NewChatDialog';

import { PresenceAvatar } from '../presence/PresenceAvatar';

import { usePresenceHydration } from '../../hooks/usePresenceHydration';

import { formatPresenceLabel } from '../../utils/presence';

import { closeSidebar } from '../../store/slices/uiSlice';



type Props = { fullPage?: boolean };



export function ChatsSidebar({ fullPage = false }: Props) {

  const navigate = useNavigate();

  const location = useLocation();

  const dispatch = useDispatch();

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



  const openChat = (convId: string) => {

    dispatch(closeSidebar());

    navigate(`/chat/${convId}`);

  };



  const isActive = (convId: string) =>

    activeId === convId || location.pathname === `/chat/${convId}`;



  return (

    <Box sx={fullPage ? { pb: 1 } : undefined}>

      {!fullPage && (

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, mb: 1 }}>

        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>Chats</Typography>

        <IconButton size="small" onClick={() => setNewOpen(true)} title="New chat">

          <AddIcon fontSize="small" />

        </IconButton>

      </Stack>

      )}



      {fullPage && (

        <Box sx={{ px: 2, pb: 1, display: 'flex', justifyContent: 'flex-end' }}>

          <IconButton

            onClick={() => setNewOpen(true)}

            color="primary"

            sx={{ width: 44, height: 44, bgcolor: 'primary.50' }}

            aria-label="New chat"

          >

            <AddIcon />

          </IconButton>

        </Box>

      )}



      <TextField

        size={fullPage ? 'medium' : 'small'}

        fullWidth

        placeholder="Search chats..."

        value={filter}

        onChange={(e) => setFilter(e.target.value)}

        sx={{ px: fullPage ? 2 : 1, mb: 1 }}

        InputProps={{

          startAdornment: (

            <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>

          ),

        }}

      />



      <Stack direction="row" spacing={0.5} sx={{ px: fullPage ? 2 : 1, mb: 1 }}>

        <Chip size="small" label="All" variant={tab === 'all' ? 'filled' : 'outlined'} onClick={() => setTab('all')} sx={{ minHeight: 32 }} />

        <Chip size="small" icon={<StarIcon />} label="Starred" variant={tab === 'starred' ? 'filled' : 'outlined'} onClick={() => setTab('starred')} sx={{ minHeight: 32 }} />

      </Stack>



      {tab === 'all' ? (

        <List disablePadding dense={!fullPage}>

          {filtered.length === 0 && (

            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2, textAlign: 'center' }}>

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

            const chatPath = `/chat/${c.id}`;

            return (

              <ListItemButton

                key={c.id}

                component={RouterLink}

                to={chatPath}

                selected={isActive(c.id)}

                onClick={() => dispatch(closeSidebar())}

                sx={{

                  borderRadius: fullPage ? 0 : 1,

                  mx: fullPage ? 0 : 0.5,

                  py: fullPage ? 1.75 : undefined,

                  minHeight: fullPage ? 72 : 48,

                  borderBottom: fullPage ? '1px solid' : 'none',

                  borderColor: 'divider',

                  textDecoration: 'none',

                  color: 'inherit',

                  WebkitTapHighlightColor: 'transparent',

                  touchAction: 'manipulation',

                  cursor: 'pointer',

                  '&:active': { bgcolor: 'action.selected' },

                }}

              >

                <ListItemAvatar sx={{ minWidth: fullPage ? 56 : 40 }}>

                  <PresenceAvatar

                    userId={other?.id}

                    sx={{ width: fullPage ? 48 : 32, height: fullPage ? 48 : 32 }}

                    src={other?.avatarUrl ?? undefined}

                  >

                    {title[0]}

                  </PresenceAvatar>

                </ListItemAvatar>

                <ListItemText

                  primary={title}

                  secondary={preview ? preview.slice(0, 60) : statusLine || (c.type === 'DIRECT' ? 'Start chatting' : '')}

                  primaryTypographyProps={{ noWrap: true, fontSize: fullPage ? 16 : 14, fontWeight: isActive(c.id) ? 700 : 600 }}

                  secondaryTypographyProps={{

                    noWrap: true,

                    fontSize: fullPage ? 14 : 12,

                    color: !preview && presence?.status === 'online' ? 'success.main' : 'text.secondary',

                  }}

                />

              </ListItemButton>

            );

          })}

        </List>

      ) : (

        <StarredMessagesList onNavigate={openChat} fullPage={fullPage} />

      )}



      <NewChatDialog open={newOpen} onClose={() => setNewOpen(false)} onCreated={load} />

    </Box>

  );

}



function StarredMessagesList({ onNavigate, fullPage }: { onNavigate: (convId: string) => void; fullPage?: boolean }) {

  const [items, setItems] = useState<Array<{ message: { id: string; content: string | null; conversation: { id: string; name?: string } }; createdAt: string }>>([]);



  useEffect(() => {

    apiClient.get('/messages/starred').then((r) => setItems(r.data.data));

  }, []);



  if (items.length === 0) {

    return <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>No starred messages</Typography>;

  }



  return (

    <List disablePadding dense={!fullPage}>

      {items.map((s) => (

        <ListItemButton

          key={s.message.id}

          onClick={() => onNavigate(s.message.conversation.id)}

          sx={{ minHeight: fullPage ? 56 : 48, WebkitTapHighlightColor: 'transparent' }}

        >

          <ListItemText

            primary={s.message.content?.slice(0, 50) ?? 'Attachment'}

            secondary={s.message.conversation.name ?? 'Chat'}

          />

        </ListItemButton>

      ))}

    </List>

  );

}


