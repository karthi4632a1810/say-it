import { messagesRepository } from './messages.repository.js';
import { conversationsService } from '../conversations/conversations.service.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { embeddingQueue } from '../../workers/queue.js';

export const messagesService = {
  async list(conversationId: string, userId: string, before?: string) {
    await conversationsService.assertMember(conversationId, userId);
    const messages = await messagesRepository.list(
      conversationId,
      userId,
      before ? new Date(before) : undefined,
    );
    return messages.reverse();
  },

  async send(
    conversationId: string,
    userId: string,
    data: {
      content?: string;
      contentType?: 'TEXT' | 'MARKDOWN';
      parentMessageId?: string;
      fileIds?: string[];
    },
  ) {
    await conversationsService.assertMember(conversationId, userId);
    const message = await messagesRepository.create({
      conversationId,
      senderId: userId,
      content: data.content?.trim() ?? '',
      contentType: data.contentType ?? 'TEXT',
      parentMessageId: data.parentMessageId,
      fileIds: data.fileIds,
    });

    const conv = await import('../conversations/conversations.repository.js').then((m) =>
      m.conversationsRepository.findById(conversationId),
    );
    if (conv?.type === 'CHANNEL' && data.content) {
      await embeddingQueue.add('ingest', {
        sourceType: 'MESSAGE',
        sourceId: message!.id,
        text: data.content,
        metadata: { conversationId, senderId: userId },
      });
    }

    const members = conv?.members.filter((m) => m.userId !== userId) ?? [];
    for (const m of members) {
      await notificationsService.create({
        userId: m.userId,
        type: 'DM',
        title: 'New message',
        body: (data.content ?? 'Attachment').slice(0, 100),
        data: { conversationId, messageId: message!.id },
      });
    }

    return message;
  },

  async edit(messageId: string, userId: string, content: string) {
    const msg = await messagesRepository.findById(messageId);
    if (!msg || msg.senderId !== userId) throw new Error('FORBIDDEN');
    return messagesRepository.edit(messageId, content, userId);
  },

  async delete(messageId: string, userId: string) {
    const msg = await messagesRepository.findById(messageId);
    if (!msg) throw new Error('NOT_FOUND');
    const member = await conversationsService.assertMember(msg.conversationId, userId);
    if (msg.senderId !== userId && !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new Error('FORBIDDEN');
    }
    return messagesRepository.softDelete(messageId, userId);
  },

  async react(messageId: string, userId: string, emoji: string) {
    const msg = await messagesRepository.findById(messageId);
    if (!msg) throw new Error('NOT_FOUND');
    await conversationsService.assertMember(msg.conversationId, userId);
    return messagesRepository.addReaction(messageId, userId, emoji);
  },

  async unreact(messageId: string, userId: string, emoji: string) {
    return messagesRepository.removeReaction(messageId, userId, emoji);
  },

  async pin(messageId: string, userId: string) {
    const msg = await messagesRepository.findById(messageId);
    if (!msg) throw new Error('NOT_FOUND');
    await conversationsService.assertMember(msg.conversationId, userId);
    return messagesRepository.pin(messageId, userId);
  },

  async unpin(messageId: string, userId: string) {
    const msg = await messagesRepository.findById(messageId);
    if (!msg) throw new Error('NOT_FOUND');
    await conversationsService.assertMember(msg.conversationId, userId);
    return messagesRepository.unpin(messageId);
  },

  async star(messageId: string, userId: string) {
    const msg = await messagesRepository.findById(messageId);
    if (!msg) throw new Error('NOT_FOUND');
    await conversationsService.assertMember(msg.conversationId, userId);
    return messagesRepository.star(messageId, userId);
  },

  async unstar(messageId: string, userId: string) {
    return messagesRepository.unstar(messageId, userId);
  },

  async listStarred(userId: string) {
    return messagesRepository.listStarred(userId);
  },

  async getInfo(messageId: string, userId: string) {
    const msg = await messagesRepository.getInfo(messageId);
    if (!msg) throw new Error('NOT_FOUND');
    await conversationsService.assertMember(msg.conversationId, userId);
    return msg;
  },

  async forward(messageId: string, userId: string, targetConversationId: string) {
    const msg = await messagesRepository.findById(messageId);
    if (!msg || msg.isDeleted) throw new Error('NOT_FOUND');
    await conversationsService.assertMember(msg.conversationId, userId);
    await conversationsService.assertMember(targetConversationId, userId);
    const prefix = msg.content ? `↪ Forwarded:\n${msg.content}` : '↪ Forwarded attachment';
    return messagesRepository.create({
      conversationId: targetConversationId,
      senderId: userId,
      content: prefix,
      forwardedFrom: messageId,
      fileIds: msg.attachments?.map((a) => a.fileId),
    });
  },

  async listPinned(conversationId: string, userId: string) {
    await conversationsService.assertMember(conversationId, userId);
    return messagesRepository.listPinned(conversationId);
  },

  async markRead(messageId: string, userId: string) {
    const msg = await messagesRepository.findById(messageId);
    if (!msg) throw new Error('NOT_FOUND');
    await conversationsService.assertMember(msg.conversationId, userId);
    return messagesRepository.markRead(messageId, userId);
  },

  async markConversationRead(conversationId: string, userId: string) {
    await conversationsService.assertMember(conversationId, userId);
    return messagesRepository.markConversationRead(conversationId, userId);
  },
};
