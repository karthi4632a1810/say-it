import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { apiClient, setAccessToken } from '../services/api/client';
import { setUser, logout as logoutAction } from '../store/slices/authSlice';
import type { RootState } from '../store';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((s: RootState) => s.auth);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { username, password });
    if (data.data.mfaRequired) return { mfaRequired: true, tempToken: data.data.tempToken };
    setAccessToken(data.data.accessToken);
    dispatch(setUser(data.data.user));
    return { mfaRequired: false };
  }, [dispatch]);

  const register = useCallback(async (username: string, password: string) => {
    const { data } = await apiClient.post('/auth/register', { username, password });
    setAccessToken(data.data.accessToken);
    dispatch(setUser(data.data.user));
  }, [dispatch]);

  const verifyMfa = useCallback(async (tempToken: string, totpCode: string) => {
    const { data } = await apiClient.post('/auth/mfa/verify', { tempToken, totpCode });
    setAccessToken(data.data.accessToken);
    dispatch(setUser(data.data.user));
  }, [dispatch]);

  const logout = useCallback(async () => {
    await apiClient.post('/auth/logout');
    setAccessToken(null);
    dispatch(logoutAction());
  }, [dispatch]);

  const fetchMe = useCallback(async () => {
    const { data } = await apiClient.get('/users/me');
    dispatch(setUser({ ...data.data, roles: data.data.roles }));
  }, [dispatch]);

  return { user, isAuthenticated, login, register, verifyMfa, logout, fetchMe };
}
