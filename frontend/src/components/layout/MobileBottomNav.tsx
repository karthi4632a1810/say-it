import { useLocation, useNavigate } from 'react-router-dom';
import {
  BottomNavigation, BottomNavigationAction, Paper, Badge,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SearchIcon from '@mui/icons-material/Search';
import { useDispatch } from 'react-redux';
import { setAiSearchOpen } from '../../store/slices/uiSlice';

type Props = { unreadCount: number };

export function MobileBottomNav({ unreadCount }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const path = location.pathname;
  let value = -1;
  if (path === '/' || path.startsWith('/chat')) value = 0;
  else if (path.startsWith('/directory')) value = 1;
  else if (path.startsWith('/notifications')) value = 2;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (t) => t.zIndex.appBar,
        borderTop: '1px solid',
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <BottomNavigation
        showLabels
        value={value}
        onChange={(_, next) => {
          if (next === 0) navigate('/');
          else if (next === 1) navigate('/directory');
          else if (next === 2) navigate('/notifications');
        }}
        sx={{
          height: 64,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            py: 1,
            '&.Mui-selected': { fontSize: '0.75rem' },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.7rem',
            '&.Mui-selected': { fontSize: '0.7rem' },
          },
        }}
      >
        <BottomNavigationAction label="Chats" icon={<ChatIcon />} />
        <BottomNavigationAction label="Directory" icon={<PeopleIcon />} />
        <BottomNavigationAction
          label="Alerts"
          icon={
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <NotificationsIcon />
            </Badge>
          }
        />
        <BottomNavigationAction
          label="Search"
          icon={<SearchIcon />}
          onClick={(e) => {
            e.preventDefault();
            dispatch(setAiSearchOpen(true));
          }}
        />
      </BottomNavigation>
    </Paper>
  );
}
