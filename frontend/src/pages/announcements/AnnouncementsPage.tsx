import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Chip, Button, Stack } from '@mui/material';
import { apiClient } from '../../services/api/client';

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: string;
  isEmergency: boolean;
  author: { displayName: string };
  publishedAt: string;
};

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    apiClient.get('/announcements').then((r) => setAnnouncements(r.data.data));
  }, []);

  const markRead = (id: string) => {
    apiClient.post(`/announcements/${id}/read`);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Announcements</Typography>
      {announcements.map((a) => (
        <Card key={a.id} sx={{ mb: 2, border: a.isEmergency ? '2px solid' : undefined, borderColor: 'error.main' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography fontWeight={600}>{a.title}</Typography>
              {a.isEmergency && <Chip label="EMERGENCY" color="error" size="small" />}
              <Chip label={a.type} size="small" />
            </Stack>
            <Typography variant="body2" sx={{ mb: 1 }}>{a.content}</Typography>
            <Typography variant="caption" color="text.secondary">
              {a.author.displayName} · {new Date(a.publishedAt).toLocaleDateString()}
            </Typography>
            <Button size="small" onClick={() => markRead(a.id)} sx={{ ml: 2 }}>Mark read</Button>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
