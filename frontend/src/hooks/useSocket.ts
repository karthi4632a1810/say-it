import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket/socket.client';
import { updatePresence } from '../store/slices/presenceSlice';

export function useSocket(enabled: boolean): Socket {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!enabled) return;
    connectSocket();
    const socket = getSocket();

    socket.on('presence:update', (data: { userId: string; status: string }) => {
      dispatch(updatePresence(data));
    });

    socket.on('message:new', () => {
      window.dispatchEvent(new CustomEvent('message:new'));
    });

    socket.on('message:updated', () => {
      window.dispatchEvent(new CustomEvent('message:updated'));
    });

    socket.on('message:deleted', () => {
      window.dispatchEvent(new CustomEvent('message:deleted'));
    });

    socket.on('message:read_receipt', () => {
      window.dispatchEvent(new CustomEvent('message:read_receipt'));
    });

    socket.on('notification:new', () => {
      window.dispatchEvent(new CustomEvent('notification:new'));
    });

    return () => {
      socket.off('presence:update');
      socket.off('message:new');
      socket.off('message:updated');
      socket.off('message:deleted');
      socket.off('message:read_receipt');
      socket.off('notification:new');
      disconnectSocket();
    };
  }, [enabled, dispatch]);

  return getSocket();
}
