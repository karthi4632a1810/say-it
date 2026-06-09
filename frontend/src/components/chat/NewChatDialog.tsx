import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, TextField, List, ListItemButton,
  ListItemAvatar, ListItemText, Avatar, CircularProgress, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api/client';

type UserResult = {
  id: string;
  username: string;
  displayName: string;
  jobTitle?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export function NewChatDialog({ open, onClose, onCreated }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const search = (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    setLoading(true);
    apiClient.get('/users/directory', { params: { q } })
      .then((r) => setUsers(r.data.data))
      .finally(() => setLoading(false));
  };

  const startDm = async (userId: string) => {
    setStarting(userId);
    try {
      const { data } = await apiClient.post('/conversations/direct', { userId });
      onCreated?.();
      onClose();
      navigate(`/chat/${data.data.id}`);
    } finally {
      setStarting(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New chat</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Search by username or name..."
          value={query}
          onChange={(e) => search(e.target.value)}
          sx={{ mb: 2 }}
        />
        {loading && <CircularProgress size={20} />}
        {!loading && query && users.length === 0 && (
          <Typography variant="body2" color="text.secondary">No users found</Typography>
        )}
        <List dense>
          {users.map((u) => (
            <ListItemButton key={u.id} onClick={() => startDm(u.id)} disabled={starting === u.id}>
              <ListItemAvatar><Avatar>{u.displayName[0]}</Avatar></ListItemAvatar>
              <ListItemText
                primary={u.displayName}
                secondary={`@${u.username}${u.jobTitle ? ` · ${u.jobTitle}` : ''}`}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
