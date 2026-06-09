import type { Server, Socket } from 'socket.io';
import { messagesService } from '../../modules/messages/messages.service.js';
import { SOCKET_EVENTS } from '../events/events.constants.js';

export function registerMessageHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  socket.on(
    SOCKET_EVENTS.MESSAGE_SEND,
    async (data: {
      conversationId: string;
      content?: string;
      contentType?: 'TEXT' | 'MARKDOWN';
      parentMessageId?: string;
      fileIds?: string[];
    }) => {
      try {
        const msg = await messagesService.send(data.conversationId, userId, {
          content: data.content,
          contentType: data.contentType,
          parentMessageId: data.parentMessageId,
          fileIds: data.fileIds,
        });
        io.to(`conversation:${data.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, msg);
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, { code: 'SEND_FAILED', message: 'Failed to send message' });
      }
    },
  );

  socket.on(SOCKET_EVENTS.MESSAGE_READ, async (data: { messageId: string }) => {
    try {
      await messagesService.markRead(data.messageId, userId);
      const msg = await import('../../modules/messages/messages.repository.js').then((m) =>
        m.messagesRepository.findById(data.messageId),
      );
      if (msg) {
        io.to(`conversation:${msg.conversationId}`).emit(SOCKET_EVENTS.READ_RECEIPT, {
          messageId: data.messageId,
          userId,
          status: 'READ',
        });
      }
    } catch {
      // ignore
    }
  });

  socket.on(SOCKET_EVENTS.CONVERSATION_READ, async (data: { conversationId: string }) => {
    try {
      const ids = await messagesService.markConversationRead(data.conversationId, userId);
      io.to(`conversation:${data.conversationId}`).emit(SOCKET_EVENTS.READ_RECEIPT, {
        conversationId: data.conversationId,
        userId,
        messageIds: ids,
        status: 'READ',
      });
    } catch {
      // ignore
    }
  });

  socket.on(SOCKET_EVENTS.MESSAGE_REACT, async (data: { messageId: string; emoji: string }) => {
    try {
      const reaction = await messagesService.react(data.messageId, userId, data.emoji);
      const msg = await import('../../modules/messages/messages.repository.js').then((m) =>
        m.messagesRepository.findById(data.messageId),
      );
      if (msg) {
        io.to(`conversation:${msg.conversationId}`).emit(SOCKET_EVENTS.REACTION_ADDED, reaction);
      }
    } catch {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'REACT_FAILED', message: 'Failed to react' });
    }
  });
}
