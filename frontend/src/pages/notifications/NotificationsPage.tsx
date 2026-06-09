import { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Button, Chip } from '@mui/material';
import { apiClient } from '../../services/api/client';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = () => apiClient.get('/notifications').then((r) => setNotifications(r.data.data));

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    const ids = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (ids.length) {
      await apiClient.post('/notifications/read', { ids });
      load();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Notifications</Typography>
        <Button onClick={markAllRead}>Mark all read</Button>
      </Box>
      <List>
        {notifications.map((n) => (
          <ListItem key={n.id} sx={{ bgcolor: n.isRead ? 'transparent' : 'action.hover', borderRadius: 1, mb: 0.5 }}>
            <ListItemText
              primary={<>{n.title} {!n.isRead && <Chip label="New" size="small" color="primary" sx={{ ml: 1 }} />}</>}
              secondary={<>{n.body}<br /><Typography variant="caption">{new Date(n.createdAt).toLocaleString()}</Typography></>}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
