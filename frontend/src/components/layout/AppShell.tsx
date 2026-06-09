import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, Badge, Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import CampaignIcon from '@mui/icons-material/Campaign';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { toggleSidebar, setAiSearchOpen } from '../../store/slices/uiSlice';
import type { RootState } from '../../store';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { apiClient } from '../../services/api/client';
import { AiSearchModal } from '../features/ai/AiSearchModal';
import { ChatsSidebar } from '../chat/ChatsSidebar';

const DRAWER_WIDTH = 280;

export function AppShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, logout, fetchMe } = useAuth();
  const sidebarOpen = useSelector((s: RootState) => s.ui.sidebarOpen);
  const aiSearchOpen = useSelector((s: RootState) => s.ui.aiSearchOpen);
  const [unreadCount, setUnreadCount] = useState(0);

  useSocket(true);

  useEffect(() => {
    fetchMe().catch(() => {});
    apiClient.get('/notifications').then((r) => setUnreadCount(r.data.meta?.unreadCount ?? 0));

    const onNotif = () => apiClient.get('/notifications').then((r) => setUnreadCount(r.data.meta?.unreadCount ?? 0));
    window.addEventListener('notification:new', onNotif);
    return () => window.removeEventListener('notification:new', onNotif);
  }, [fetchMe]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dispatch(setAiSearchOpen(true));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  const nav = [
    { label: 'Directory', icon: <PeopleIcon />, path: '/directory' },
    { label: 'Meetings', icon: <EventIcon />, path: '/meetings' },
    { label: 'Announcements', icon: <CampaignIcon />, path: '/announcements' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => dispatch(toggleSidebar())} edge="start">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>Say IT</Typography>
          <IconButton color="inherit" onClick={() => dispatch(setAiSearchOpen(true))} title="AI Search (Ctrl+K)">
            <SearchIcon />
          </IconButton>
          <Typography variant="body2" sx={{ mr: 2 }}>{user?.displayName}</Typography>
          <IconButton color="inherit" onClick={() => logout().then(() => navigate('/login'))}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer variant="persistent" open={sidebarOpen} sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', mt: 8 },
      }}>
        <Box sx={{ overflow: 'auto', py: 1 }}>
          <ChatsSidebar />
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>Menu</Typography>
          <List dense>
            {nav.map((item) => (
              <ListItemButton key={item.path} onClick={() => navigate(item.path)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
            <ListItemButton onClick={() => navigate('/notifications')}>
              <ListItemIcon>
                <Badge badgeContent={unreadCount} color="error"><CampaignIcon /></Badge>
              </ListItemIcon>
              <ListItemText primary="Notifications" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, ml: sidebarOpen ? `${DRAWER_WIDTH}px` : 0, transition: 'margin 0.2s' }}>
        <Outlet />
      </Box>

      <AiSearchModal open={aiSearchOpen} onClose={() => dispatch(setAiSearchOpen(false))} />
    </Box>
  );
}
