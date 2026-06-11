import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { toggleSidebar, setAiSearchOpen } from '../../store/slices/uiSlice';
import type { RootState } from '../../store';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { apiClient } from '../../services/api/client';
import { AiSearchModal } from '../features/ai/AiSearchModal';
import { ChatsSidebar } from '../chat/ChatsSidebar';

const DEFAULT_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 520;
const SIDEBAR_WIDTH_KEY = 'sayit-sidebar-width';

function readSidebarWidth(): number {
  const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
  const n = saved ? Number(saved) : DEFAULT_SIDEBAR_WIDTH;
  if (!Number.isFinite(n)) return DEFAULT_SIDEBAR_WIDTH;
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, n));
}

export function AppShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, logout, fetchMe } = useAuth();
  const sidebarOpen = useSelector((s: RootState) => s.ui.sidebarOpen);
  const aiSearchOpen = useSelector((s: RootState) => s.ui.aiSearchOpen);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth);
  const [resizing, setResizing] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chat/');

  sidebarWidthRef.current = sidebarWidth;

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX)));
    };
    const onUp = () => {
      setResizing(false);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidthRef.current));
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

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
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
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
          <IconButton color="inherit" onClick={async () => { await logout(); navigate('/login'); }}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? sidebarWidth : 0,
          flexShrink: 0,
          transition: resizing ? 'none' : 'width 0.2s',
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            boxSizing: 'border-box',
            top: 64,
            height: 'calc(100% - 64px)',
            overflow: 'visible',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Box sx={{ overflow: 'auto', py: 1, height: '100%' }}>
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
        <Box
          onMouseDown={startResize}
          sx={{
            position: 'absolute',
            top: 0,
            right: -3,
            width: 6,
            height: '100%',
            cursor: 'col-resize',
            zIndex: (t) => t.zIndex.drawer + 2,
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 2,
              width: 2,
              borderRadius: 1,
              bgcolor: 'transparent',
              transition: 'background-color 0.15s',
            },
            '&:hover::after': { bgcolor: 'primary.main', opacity: 0.35 },
          }}
        />
      </Drawer>

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          height: '100vh',
          pt: '64px',
          boxSizing: 'border-box',
          ...(isChatRoute
            ? { display: 'flex', flexDirection: 'column', overflow: 'hidden' }
            : { p: 3, overflow: 'auto' }),
        }}
      >
        {isChatRoute ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Outlet />
          </Box>
        ) : (
          <Outlet />
        )}
      </Box>

      <AiSearchModal open={aiSearchOpen} onClose={() => dispatch(setAiSearchOpen(false))} />
    </Box>
  );
}
