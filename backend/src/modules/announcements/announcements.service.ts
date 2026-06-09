import { prisma } from '../../config/database.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { embeddingQueue } from '../../workers/queue.js';

export const announcementsService = {
  async list(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return prisma.announcement.findMany({
      where: {
        isPublished: true,
        OR: [
          { type: 'COMPANY' },
          { type: 'EMERGENCY' },
          { departmentId: user?.departmentId ?? undefined },
        ],
      },
      include: { author: { select: { id: true, displayName: true } }, department: true },
      orderBy: [{ isEmergency: 'desc' }, { publishedAt: 'desc' }],
    });
  },

  async create(userId: string, data: {
    title: string;
    content: string;
    type: 'COMPANY' | 'DEPARTMENT' | 'EMERGENCY';
    departmentId?: string;
    isEmergency?: boolean;
    expiresAt?: string;
  }) {
    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type,
        authorId: userId,
        departmentId: data.departmentId,
        isEmergency: data.isEmergency ?? false,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    await embeddingQueue.add('ingest', {
      sourceType: 'ANNOUNCEMENT',
      sourceId: announcement.id,
      text: `${data.title}\n${data.content}`,
      metadata: { type: data.type, departmentId: data.departmentId },
    });

    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
    for (const u of users) {
      await notificationsService.create({
        userId: u.id,
        type: 'ANNOUNCEMENT',
        title: data.isEmergency ? 'EMERGENCY: ' + data.title : data.title,
        body: data.content.slice(0, 200),
        data: { announcementId: announcement.id, isEmergency: data.isEmergency },
      });
    }

    return announcement;
  },

  async markRead(announcementId: string, userId: string) {
    return prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      create: { announcementId, userId },
      update: { readAt: new Date() },
    });
  },
};
