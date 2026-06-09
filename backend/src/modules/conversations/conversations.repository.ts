import { prisma } from '../../config/database.js';
import type { ConversationType } from '@prisma/client';

export const conversationsRepository = {
  findMember(conversationId: string, userId: string) {
    return prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
  },

  listForUser(userId: string) {
    return prisma.conversation.findMany({
      where: { members: { some: { userId } }, isArchived: false },
      include: {
        members: { include: { user: { select: { id: true, displayName: true, avatarUrl: true, username: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, displayName: true, avatarUrl: true, username: true } } } },
        department: true,
      },
    });
  },

  findDirect(userId1: string, userId2: string) {
    return prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId: userId1 } } },
          { members: { some: { userId: userId2 } } },
        ],
      },
      include: { members: true },
    });
  },

  create(data: {
    type: ConversationType;
    name?: string;
    description?: string;
    departmentId?: string;
    isPrivate?: boolean;
    createdBy: string;
    memberIds: string[];
  }) {
    return prisma.conversation.create({
      data: {
        type: data.type,
        name: data.name,
        description: data.description,
        departmentId: data.departmentId,
        isPrivate: data.isPrivate ?? false,
        createdBy: data.createdBy,
        members: {
          create: data.memberIds.map((userId, i) => ({
            userId,
            role: i === 0 ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      include: { members: true },
    });
  },

  update(id: string, data: { name?: string; description?: string }) {
    return prisma.conversation.update({ where: { id }, data });
  },

  addMember(conversationId: string, userId: string) {
    return prisma.conversationMember.create({
      data: { conversationId, userId, role: 'MEMBER' },
    });
  },

  removeMember(conversationId: string, userId: string) {
    return prisma.conversationMember.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });
  },
};
