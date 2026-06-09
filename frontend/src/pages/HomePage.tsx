import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, Paper } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import { apiClient } from '../services/api/client';

export function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/conversations')
      .then((r) => {
        const convs = r.data.data;
        if (convs.length > 0) {
          navigate(`/chat/${convs[0].id}`, { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography color="text.secondary">Loading conversations...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 420 }}>
        <ChatIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>No conversations yet</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Open the Directory to find teammates and start a chat, or check Announcements for updates.
        </Typography>
        <Button variant="contained" startIcon={<PeopleIcon />} onClick={() => navigate('/directory')}>
          Browse Directory
        </Button>
      </Paper>
    </Box>
  );
}
