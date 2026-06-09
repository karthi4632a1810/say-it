import type { Server, Socket } from 'socket.io';
import { setPresence } from '../../lib/presence.js';
import { SOCKET_EVENTS } from '../events/events.constants.js';
import { prisma } from '../../config/database.js';

export async function joinUserRooms(socket: Socket): Promise<void> {
  const userId = socket.data.userId as string;
  await socket.join(`user:${userId}`);
  await socket.join('org:broadcast');

  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  for (const m of memberships) {
    await socket.join(`conversation:${m.conversationId}`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { departmentId: true } });
  if (user?.departmentId) {
    await socket.join(`department:${user.departmentId}`);
  }
}

export function registerPresenceHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  setPresence(userId, 'online').then(() => {
    io.emit(SOCKET_EVENTS.PRESENCE_BROADCAST, { userId, status: 'online' });
  });

  socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, async (data: { status: string }) => {
    await setPresence(userId, data.status);
    io.emit(SOCKET_EVENTS.PRESENCE_BROADCAST, { userId, status: data.status });
  });

  socket.on(SOCKET_EVENTS.CHANNEL_JOIN, async (data: { conversationId: string }) => {
    await socket.join(`conversation:${data.conversationId}`);
  });

  socket.on(SOCKET_EVENTS.CHANNEL_LEAVE, async (data: { conversationId: string }) => {
    await socket.leave(`conversation:${data.conversationId}`);
  });

  socket.on('disconnect', async () => {
    await setPresence(userId, 'offline');
    io.emit(SOCKET_EVENTS.PRESENCE_BROADCAST, { userId, status: 'offline' });
  });
}
