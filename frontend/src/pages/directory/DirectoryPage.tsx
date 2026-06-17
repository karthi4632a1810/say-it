import { useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {

  Box, TextField, Grid, Card, CardContent, Typography, Chip, Stack, Button, Alert,

} from '@mui/material';

import ChatIcon from '@mui/icons-material/Chat';

import { apiClient } from '../../services/api/client';

import { PresenceAvatar } from '../../components/presence/PresenceAvatar';

import { PresenceLabel } from '../../components/presence/PresenceLabel';

import { usePresenceHydration } from '../../hooks/usePresenceHydration';

import { useIsMobile } from '../../hooks/useIsMobile';

import { closeSidebar } from '../../store/slices/uiSlice';

import { useDispatch } from 'react-redux';



type User = {

  id: string;

  username?: string;

  displayName: string;

  fullName: string;

  jobTitle?: string;

  department?: { name: string };

  skills?: Array<{ skill: string }>;

};



export function DirectoryPage() {

  const navigate = useNavigate();

  const dispatch = useDispatch();

  const isMobile = useIsMobile();

  const [query, setQuery] = useState('');

  const [users, setUsers] = useState<User[]>([]);

  const [starting, setStarting] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);



  const search = (q: string) => {

    apiClient.get('/users/directory', { params: { q } }).then((r) => setUsers(r.data.data));

  };



  const userIds = useMemo(() => users.map((u) => u.id), [users]);

  usePresenceHydration(userIds);



  const messageUser = async (userId: string) => {

    setStarting(userId);

    setError(null);

    try {

      const { data } = await apiClient.post('/conversations/direct', { userId });

      dispatch(closeSidebar());

      navigate(`/chat/${data.data.id}`);

    } catch (err: unknown) {

      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;

      setError(msg ?? 'Could not start chat. Check your connection.');

    } finally {

      setStarting(null);

    }

  };



  return (

    <Box sx={{ pb: isMobile ? 2 : 0 }}>

      <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} gutterBottom>

        Employee Directory

      </Typography>

      {error && (

        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>

      )}

      <TextField

        fullWidth

        placeholder="Search by username, name, skill, or title..."

        value={query}

        onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}

        sx={{ mb: 3 }}

      />

      <Grid container spacing={2}>

        {users.map((u) => (

          <Grid item xs={12} sm={6} md={4} key={u.id}>

            <Card>

              <CardContent>

                <Stack direction="row" spacing={2} alignItems="center">

                  <PresenceAvatar userId={u.id}>{u.displayName[0]}</PresenceAvatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>

                    <Typography fontWeight={600}>{u.displayName}</Typography>

                    <PresenceLabel userId={u.id} display="block" sx={{ mb: 0.25 }} />

                    {u.username && <Typography variant="caption" color="text.secondary">@{u.username}</Typography>}

                    <Typography variant="body2" color="text.secondary">{u.jobTitle}</Typography>

                    <Typography variant="caption">{u.department?.name}</Typography>

                  </Box>

                </Stack>

                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>

                  {u.skills?.map((s) => <Chip key={s.skill} label={s.skill} size="small" />)}

                </Stack>

                <Button

                  fullWidth={isMobile}

                  variant={isMobile ? 'contained' : 'text'}

                  size={isMobile ? 'medium' : 'small'}

                  startIcon={<ChatIcon />}

                  sx={{ mt: 1.5, minHeight: isMobile ? 44 : undefined }}

                  onClick={() => messageUser(u.id)}

                  disabled={starting === u.id}

                >

                  {starting === u.id ? 'Opening…' : 'Message'}

                </Button>

              </CardContent>

            </Card>

          </Grid>

        ))}

      </Grid>

    </Box>

  );

}


