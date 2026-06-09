import { prisma } from '../../config/database.js';
import type { NotificationType, Prisma } from '@prisma/client';

export const notificationsService = {
  create(data: { userId: string; type: NotificationType; title: string; body: string; data?: Record<string, unknown> }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: (data.data ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  },

  list(userId: string, unreadOnly = false) {
    return prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async markRead(userId: string, ids: string[]) {
    await prisma.notification.updateMany({
      where: { userId, id: { in: ids } },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async markOneRead(userId: string, id: string) {
    await prisma.notification.updateMany({
      where: { userId, id },
      data: { isRead: true, readAt: new Date() },
    });
  },

  unreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  },
};
