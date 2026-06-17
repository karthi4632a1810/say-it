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

import NotificationsIcon from '@mui/icons-material/Notifications';

import { useDispatch, useSelector } from 'react-redux';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { toggleSidebar, setAiSearchOpen, closeSidebar, setSidebarOpen } from '../../store/slices/uiSlice';

import type { RootState } from '../../store';

import { useAuth } from '../../hooks/useAuth';

import { useSocket } from '../../hooks/useSocket';

import { useIsMobile } from '../../hooks/useIsMobile';

import { apiClient } from '../../services/api/client';

import { AiSearchModal } from '../features/ai/AiSearchModal';

import { ChatsSidebar } from '../chat/ChatsSidebar';

import { CallProvider } from '../../context/CallProvider';

import { IncomingCallDialog } from '../call/IncomingCallDialog';

import { VoiceCallOverlay } from '../call/VoiceCallOverlay';
import { HttpsMicBanner } from './HttpsMicBanner';

import { MobileBottomNav } from './MobileBottomNav';



const DEFAULT_SIDEBAR_WIDTH = 280;

const MIN_SIDEBAR_WIDTH = 220;

const MAX_SIDEBAR_WIDTH = 520;

const SIDEBAR_WIDTH_KEY = 'sayit-sidebar-width';

const MOBILE_BOTTOM_NAV = 64;



function readSidebarWidth(): number {

  const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);

  const n = saved ? Number(saved) : DEFAULT_SIDEBAR_WIDTH;

  if (!Number.isFinite(n)) return DEFAULT_SIDEBAR_WIDTH;

  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, n));

}



export function AppShell() {

  const dispatch = useDispatch();

  const navigate = useNavigate();

  const isMobile = useIsMobile();

  const { user, logout, fetchMe } = useAuth();

  const sidebarOpen = useSelector((s: RootState) => s.ui.sidebarOpen);

  const aiSearchOpen = useSelector((s: RootState) => s.ui.aiSearchOpen);

  const [unreadCount, setUnreadCount] = useState(0);

  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth);

  const [resizing, setResizing] = useState(false);

  const sidebarWidthRef = useRef(sidebarWidth);

  const location = useLocation();

  const isChatRoute = location.pathname.startsWith('/chat/');

  const isChatListRoute = location.pathname === '/' || location.pathname === '/chats';

  const showMobileBottomNav = isMobile && !isChatRoute;



  sidebarWidthRef.current = sidebarWidth;



  const startResize = useCallback((e: React.MouseEvent) => {

    e.preventDefault();

    setResizing(true);

  }, []);



  useEffect(() => {

    if (!resizing || isMobile) return;

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

  }, [resizing, isMobile]);



  useLayoutEffect(() => {
    if (isMobile) dispatch(closeSidebar());
    else dispatch(setSidebarOpen(true));
  }, [isMobile, dispatch]);

  useLayoutEffect(() => {
    if (isMobile) dispatch(closeSidebar());
  }, [location.pathname, isMobile, dispatch]);



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



  const goNav = (path: string) => {

    navigate(path);

    if (isMobile) dispatch(closeSidebar());

  };



  const toolbarH = isMobile ? 56 : 64;

  const bottomPad = showMobileBottomNav

    ? `calc(${MOBILE_BOTTOM_NAV}px + env(safe-area-inset-bottom, 0px))`

    : 'env(safe-area-inset-bottom, 0px)';



  const drawerContent = (

    <Box sx={{ overflow: 'auto', py: 1, height: '100%' }}>

      {!isMobile && (

        <>

          <ChatsSidebar />

          <Divider sx={{ my: 1.5 }} />

        </>

      )}

      <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>Menu</Typography>

      <List dense={!isMobile}>

        {nav.map((item) => (

          <ListItemButton

            key={item.path}

            onClick={() => goNav(item.path)}

            sx={isMobile ? { py: 1.5, minHeight: 48 } : undefined}

          >

            <ListItemIcon sx={isMobile ? { minWidth: 44 } : undefined}>{item.icon}</ListItemIcon>

            <ListItemText primary={item.label} primaryTypographyProps={isMobile ? { fontSize: 16 } : undefined} />

          </ListItemButton>

        ))}

        <ListItemButton onClick={() => goNav('/notifications')} sx={isMobile ? { py: 1.5, minHeight: 48 } : undefined}>

          <ListItemIcon sx={isMobile ? { minWidth: 44 } : undefined}>

            <Badge badgeContent={unreadCount} color="error"><NotificationsIcon /></Badge>

          </ListItemIcon>

          <ListItemText primary="Notifications" primaryTypographyProps={isMobile ? { fontSize: 16 } : undefined} />

        </ListItemButton>

        {isMobile && (

          <ListItemButton onClick={async () => { await logout(); navigate('/login'); }} sx={{ py: 1.5, minHeight: 48 }}>

            <ListItemIcon sx={{ minWidth: 44 }}><LogoutIcon /></ListItemIcon>

            <ListItemText primary="Sign out" primaryTypographyProps={{ fontSize: 16 }} />

          </ListItemButton>

        )}

      </List>

    </Box>

  );



  return (

    <CallProvider>

    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>

      <AppBar

        position="fixed"

        elevation={isMobile ? 1 : 4}

        sx={{

          zIndex: (t) => t.zIndex.drawer + 1,

          pt: 'env(safe-area-inset-top, 0px)',

        }}

      >

        <Toolbar variant={isMobile ? 'dense' : 'regular'} sx={{ minHeight: toolbarH }}>

          <IconButton

            color="inherit"

            onClick={() => dispatch(toggleSidebar())}

            edge="start"

            sx={{ mr: 0.5, width: 44, height: 44 }}

            aria-label="Menu"

          >

            <MenuIcon />

          </IconButton>

          <Typography

            variant={isMobile ? 'subtitle1' : 'h6'}

            sx={{ flexGrow: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}

          >

            Say IT

          </Typography>

          <IconButton

            color="inherit"

            onClick={() => dispatch(setAiSearchOpen(true))}

            title="AI Search"

            sx={{ width: 44, height: 44 }}

          >

            <SearchIcon />

          </IconButton>

          {!isMobile && (

            <>

              <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>

                {user?.displayName}

              </Typography>

              <IconButton color="inherit" onClick={async () => { await logout(); navigate('/login'); }}>

                <LogoutIcon />

              </IconButton>

            </>

          )}

        </Toolbar>

      </AppBar>



      <Drawer

        variant={isMobile ? 'temporary' : 'persistent'}

        open={sidebarOpen}

        onClose={() => dispatch(closeSidebar())}

        ModalProps={{ keepMounted: true }}

        sx={{

          width: isMobile ? 'min(320px, 88vw)' : sidebarOpen ? sidebarWidth : 0,

          flexShrink: 0,

          transition: resizing ? 'none' : 'width 0.2s',

          '& .MuiDrawer-paper': {

            width: isMobile ? 'min(320px, 88vw)' : sidebarWidth,

            boxSizing: 'border-box',

            top: `calc(${toolbarH}px + env(safe-area-inset-top, 0px))`,

            height: `calc(100% - ${toolbarH}px - env(safe-area-inset-top, 0px))`,

            overflow: 'visible',

            borderRight: '1px solid',

            borderColor: 'divider',

          },

        }}

      >

        {drawerContent}

        {!isMobile && (

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

        )}

      </Drawer>



      <Box

        component="main"

        sx={{

          flex: 1,

          minWidth: 0,

          minHeight: 0,

          height: '100dvh',

          pt: `calc(${toolbarH}px + env(safe-area-inset-top, 0px))`,

          pb: bottomPad,

          boxSizing: 'border-box',

          ...(isChatRoute || (isMobile && isChatListRoute)

            ? { display: 'flex', flexDirection: 'column', overflow: 'hidden' }

            : { p: isMobile ? 2 : 3, overflow: 'auto' }),

        }}

      >

        {isChatRoute || (isMobile && isChatListRoute) ? (

          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%' }}>

            <Outlet />

          </Box>

        ) : (

          <Outlet />

        )}

      </Box>



      {showMobileBottomNav && <MobileBottomNav unreadCount={unreadCount} />}



      <AiSearchModal open={aiSearchOpen} onClose={() => dispatch(setAiSearchOpen(false))} />

      <HttpsMicBanner />

      <IncomingCallDialog />

      <VoiceCallOverlay />

    </Box>

    </CallProvider>

  );

}


