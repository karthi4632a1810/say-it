import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Stack, Chip } from '@mui/material';
import { apiClient } from '../../services/api/client';

type Meeting = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  organizer: { displayName: string };
  status: string;
};

export function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    apiClient.get('/meetings').then((r) => setMeetings(r.data.data));
  }, []);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Meetings</Typography>
      <Stack spacing={2}>
        {meetings.map((m) => (
          <Card key={m.id}>
            <CardContent>
              <Typography fontWeight={600}>{m.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(m.startsAt).toLocaleString()} — {new Date(m.endsAt).toLocaleTimeString()}
              </Typography>
              <Typography variant="caption">Organizer: {m.organizer.displayName}</Typography>
              <Chip label={m.status} size="small" sx={{ ml: 1 }} />
            </CardContent>
          </Card>
        ))}
        {meetings.length === 0 && <Typography color="text.secondary">No meetings scheduled</Typography>}
      </Stack>
    </Box>
  );
}
