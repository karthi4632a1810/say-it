import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, Paper } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import { apiClient } from '../services/api/client';
import { ChatsSidebar } from '../components/chat/ChatsSidebar';
import { useIsMobile } from '../hooks/useIsMobile';

export function HomePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [hasConversations, setHasConversations] = useState(false);

  useEffect(() => {
    apiClient
      .get('/conversations')
      .then((r) => {
        const convs = r.data.data;
        setHasConversations(convs.length > 0);
        if (!isMobile && convs.length > 0) {
          navigate(`/chat/${convs[0].id}`, { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [navigate, isMobile]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, py: 8 }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography color="text.secondary">Loading conversations...</Typography>
      </Box>
    );
  }

  if (isMobile) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700}>Messages</Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          <ChatsSidebar fullPage />
        </Box>
      </Box>
    );
  }

  if (!hasConversations) {
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

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <CircularProgress />
    </Box>
  );
}
