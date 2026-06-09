import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Grid, Card, CardContent, Typography, Avatar, Chip, Stack, Button,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { apiClient } from '../../services/api/client';

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
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [starting, setStarting] = useState<string | null>(null);

  const search = (q: string) => {
    apiClient.get('/users/directory', { params: { q } }).then((r) => setUsers(r.data.data));
  };

  const messageUser = async (userId: string) => {
    setStarting(userId);
    try {
      const { data } = await apiClient.post('/conversations/direct', { userId });
      navigate(`/chat/${data.data.id}`);
    } finally {
      setStarting(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Employee Directory</Typography>
      <TextField fullWidth placeholder="Search by username, name, skill, or title..." value={query}
        onChange={(e) => { setQuery(e.target.value); search(e.target.value); }} sx={{ mb: 3 }} />
      <Grid container spacing={2}>
        {users.map((u) => (
          <Grid item xs={12} sm={6} md={4} key={u.id}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar>{u.displayName[0]}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={600}>{u.displayName}</Typography>
                    {u.username && <Typography variant="caption" color="text.secondary">@{u.username}</Typography>}
                    <Typography variant="body2" color="text.secondary">{u.jobTitle}</Typography>
                    <Typography variant="caption">{u.department?.name}</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                  {u.skills?.map((s) => <Chip key={s.skill} label={s.skill} size="small" />)}
                </Stack>
                <Button
                  size="small"
                  startIcon={<ChatIcon />}
                  sx={{ mt: 1.5 }}
                  onClick={() => messageUser(u.id)}
                  disabled={starting === u.id}
                >
                  Message
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
