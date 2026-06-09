import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { HomePage } from '../pages/HomePage';
import { ChatPage } from '../pages/chat/ChatPage';
import { DirectoryPage } from '../pages/directory/DirectoryPage';
import { MeetingsPage } from '../pages/meetings/MeetingsPage';
import { AnnouncementsPage } from '../pages/announcements/AnnouncementsPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';

const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'chat/:id', element: <ChatPage /> },
      { path: 'directory', element: <DirectoryPage /> },
      { path: 'meetings', element: <MeetingsPage /> },
      { path: 'announcements', element: <AnnouncementsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);
