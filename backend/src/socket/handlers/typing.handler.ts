import type { Server, Socket } from 'socket.io';
import { redis } from '../../config/redis.js';
import { SOCKET_EVENTS } from '../events/events.constants.js';

export function registerTypingHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  const setTyping = async (conversationId: string, isTyping: boolean) => {
    const key = `typing:${conversationId}:${userId}`;
    if (isTyping) {
      await redis.setex(key, 3, '1');
    } else {
      await redis.del(key);
    }
    io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING_UPDATE, {
      conversationId,
      userId,
      isTyping,
    });
  };

  socket.on(SOCKET_EVENTS.TYPING_START, (data: { conversationId: string }) => {
    setTyping(data.conversationId, true).catch(() => {});
  });

  socket.on(SOCKET_EVENTS.TYPING_STOP, (data: { conversationId: string }) => {
    setTyping(data.conversationId, false).catch(() => {});
  });
}
