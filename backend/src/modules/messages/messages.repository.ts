import { prisma } from '../../config/database.js';

export const messagesRepository = {
  list(conversationId: string, viewerId: string, before?: Date, limit = 50) {
    return prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false,
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
        reactions: { include: { user: { select: { id: true, displayName: true } } } },
        attachments: { include: { file: true } },
        statuses: { include: { user: { select: { id: true, displayName: true } } } },
        stars: { where: { userId: viewerId }, select: { userId: true } },
        parent: {
          select: {
            id: true,
            content: true,
            sender: { select: { displayName: true } },
            attachments: { include: { file: { select: { originalName: true, mimeType: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  findById(id: string) {
    return prisma.message.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
        reactions: { include: { user: { select: { id: true, displayName: true } } } },
        attachments: { include: { file: true } },
        statuses: { include: { user: { select: { id: true, displayName: true } } } },
      },
    });
  },

  create(data: {
    conversationId: string;
    senderId: string;
    content: string;
    contentType?: 'TEXT' | 'MARKDOWN';
    parentMessageId?: string;
    forwardedFrom?: string;
    fileIds?: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content || null,
          contentType: data.contentType ?? 'TEXT',
          parentMessageId: data.parentMessageId,
          forwardedFrom: data.forwardedFrom,
        },
        include: {
          sender: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
          attachments: { include: { file: true } },
          statuses: true,
          stars: true,
        },
      });

      if (data.fileIds?.length) {
        for (const fileId of data.fileIds) {
          await tx.messageAttachment.create({ data: { messageId: message.id, fileId } });
          await tx.file.update({ where: { id: fileId }, data: { conversationId: data.conversationId } });
        }
      }

      const members = await tx.conversationMember.findMany({
        where: { conversationId: data.conversationId },
        select: { userId: true },
      });

      for (const m of members) {
        await tx.messageStatus.create({
          data: {
            messageId: message.id,
            userId: m.userId,
            status: m.userId === data.senderId ? 'SENT' : 'DELIVERED',
            deliveredAt: m.userId === data.senderId ? undefined : new Date(),
          },
        });
      }

      await tx.conversation.update({
        where: { id: data.conversationId },
        data: { lastMessageId: message.id, lastActivityAt: new Date() },
      });

      return tx.message.findUnique({
        where: { id: message.id },
        include: {
          sender: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
          attachments: { include: { file: true } },
          statuses: { include: { user: { select: { id: true, displayName: true } } } },
          stars: true,
        },
      });
    });
  },

  edit(id: string, content: string, editedBy: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.message.findUnique({ where: { id } });
      if (!existing?.content) throw new Error('NOT_FOUND');
      await tx.messageEdit.create({
        data: { messageId: id, previousContent: existing.content, editedBy },
      });
      return tx.message.update({
        where: { id },
        data: { content, isEdited: true },
        include: {
          sender: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
          statuses: { include: { user: { select: { id: true, displayName: true } } } },
          attachments: { include: { file: true } },
          stars: true,
        },
      });
    });
  },

  softDelete(id: string, deletedBy: string) {
    return prisma.message.update({
      where: { id },
      data: { isDeleted: true, content: null, deletedBy },
    });
  },

  addReaction(messageId: string, userId: string, emoji: string) {
    return prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
      include: { user: { select: { id: true, displayName: true } } },
    });
  },

  removeReaction(messageId: string, userId: string, emoji: string) {
    return prisma.messageReaction.delete({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });
  },

  pin(id: string, pinnedBy: string) {
    return prisma.message.update({
      where: { id },
      data: { isPinned: true, pinnedAt: new Date(), pinnedBy },
    });
  },

  unpin(id: string) {
    return prisma.message.update({
      where: { id },
      data: { isPinned: false, pinnedAt: null, pinnedBy: null },
    });
  },

  star(messageId: string, userId: string) {
    return prisma.messageStar.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: {},
    });
  },

  unstar(messageId: string, userId: string) {
    return prisma.messageStar.delete({
      where: { messageId_userId: { messageId, userId } },
    });
  },

  listStarred(userId: string) {
    return prisma.messageStar.findMany({
      where: { userId, message: { isDeleted: false } },
      include: {
        message: {
          include: {
            sender: { select: { id: true, displayName: true } },
            conversation: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },

  getInfo(messageId: string) {
    return prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, displayName: true } },
        statuses: { include: { user: { select: { id: true, displayName: true } } } },
        edits: { orderBy: { editedAt: 'desc' } },
        stars: { include: { user: { select: { id: true, displayName: true } } } },
      },
    });
  },

  listPinned(conversationId: string) {
    return prisma.message.findMany({
      where: { conversationId, isPinned: true, isDeleted: false },
      include: { sender: { select: { id: true, displayName: true } } },
      orderBy: { pinnedAt: 'desc' },
    });
  },

  markRead(messageId: string, userId: string) {
    return prisma.messageStatus.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, status: 'READ', readAt: new Date() },
      update: { status: 'READ', readAt: new Date() },
    });
  },

  async markConversationRead(conversationId: string, userId: string) {
    const messages = await prisma.message.findMany({
      where: { conversationId, isDeleted: false, senderId: { not: userId } },
      select: { id: true },
    });
    for (const m of messages) {
      await this.markRead(m.id, userId);
    }
    await prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return messages.map((m) => m.id);
  },
};
