import type { Socket } from 'socket.io';
import { verifyAccessToken } from '../config/jwt.js';

export function socketAuth(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    next(new Error('UNAUTHORIZED'));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    socket.data.userId = payload.userId;
    socket.data.roles = payload.roles;
    next();
  } catch {
    next(new Error('INVALID_TOKEN'));
  }
}
