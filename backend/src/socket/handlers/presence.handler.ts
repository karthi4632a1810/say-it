import type { Server, Socket } from 'socket.io';
import { setPresence } from '../../lib/presence.js';
import { SOCKET_EVENTS } from '../events/events.constants.js';
import { prisma } from '../../config/database.js';
import { usersRepository } from '../../modules/users/users.repository.js';

const HEARTBEAT_MS = 45_000;

async function broadcastPresence(
  io: Server,
  userId: string,
  status: string,
  lastActiveAt?: Date | null,
) {
  io.emit(SOCKET_EVENTS.PRESENCE_BROADCAST, {
    userId,
    status,
    lastActiveAt: status === 'offline' ? (lastActiveAt?.toISOString() ?? new Date().toISOString()) : null,
  });
}

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

  const goOnline = async () => {
    await setPresence(userId, 'online');
    await usersRepository.touchLastActive(userId);
    await broadcastPresence(io, userId, 'online');
  };

  void goOnline();

  const heartbeat = setInterval(() => {
    void (async () => {
      await setPresence(userId, 'online');
      await usersRepository.touchLastActive(userId);
    })();
  }, HEARTBEAT_MS);

  socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, async (data: { status: string }) => {
    await setPresence(userId, data.status);
    if (data.status !== 'offline') {
      await usersRepository.touchLastActive(userId);
      await broadcastPresence(io, userId, data.status);
    } else {
      const updated = await usersRepository.touchLastActive(userId);
      await broadcastPresence(io, userId, 'offline', updated.lastActiveAt);
    }
  });

  socket.on(SOCKET_EVENTS.CHANNEL_JOIN, async (data: { conversationId: string }) => {
    await socket.join(`conversation:${data.conversationId}`);
  });

  socket.on(SOCKET_EVENTS.CHANNEL_LEAVE, async (data: { conversationId: string }) => {
    await socket.leave(`conversation:${data.conversationId}`);
  });

  socket.on('disconnect', async () => {
    clearInterval(heartbeat);
    await setPresence(userId, 'offline');
    const updated = await usersRepository.touchLastActive(userId);
    await broadcastPresence(io, userId, 'offline', updated.lastActiveAt);
  });
}
