import type { Request, Response } from 'express';
import { messagesService } from './messages.service.js';
import { sendSuccess, sendError } from '../../lib/response.js';
import { paramId } from '../../lib/params.js';

export const messagesController = {
  async list(req: Request, res: Response) {
    try {
      const before = req.query.before as string | undefined;
      const messages = await messagesService.list(paramId(req.params.id), req.user!.userId, before);
      sendSuccess(res, messages, 200, { hasMore: messages.length === 50 });
    } catch {
      sendError(res, 'FORBIDDEN', 'Not a member', 403);
    }
  },

  async send(req: Request, res: Response) {
    try {
      const message = await messagesService.send(paramId(req.params.id), req.user!.userId, req.body);
      sendSuccess(res, message, 201);
    } catch {
      sendError(res, 'FORBIDDEN', 'Not a member', 403);
    }
  },

  async edit(req: Request, res: Response) {
    try {
      const message = await messagesService.edit(paramId(req.params.id), req.user!.userId, req.body.content);
      sendSuccess(res, message);
    } catch {
      sendError(res, 'FORBIDDEN', 'Not authorized', 403);
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const deleted = await messagesService.delete(paramId(req.params.id), req.user!.userId);
      sendSuccess(res, { deleted: true, message: deleted });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'NOT_FOUND') sendError(res, 'NOT_FOUND', 'Message not found', 404);
      else sendError(res, 'FORBIDDEN', 'Not authorized', 403);
    }
  },

  async react(req: Request, res: Response) {
    try {
      const reaction = await messagesService.react(paramId(req.params.id), req.user!.userId, req.body.emoji);
      sendSuccess(res, reaction);
    } catch {
      sendError(res, 'FORBIDDEN', 'Not a member', 403);
    }
  },

  async unreact(req: Request, res: Response) {
    await messagesService.unreact(paramId(req.params.id), req.user!.userId, paramId(req.params.emoji));
    sendSuccess(res, { removed: true });
  },

  async pin(req: Request, res: Response) {
    try {
      const message = await messagesService.pin(paramId(req.params.id), req.user!.userId);
      sendSuccess(res, message);
    } catch {
      sendError(res, 'FORBIDDEN', 'Not authorized', 403);
    }
  },

  async unpin(req: Request, res: Response) {
    try {
      const message = await messagesService.unpin(paramId(req.params.id), req.user!.userId);
      sendSuccess(res, message);
    } catch {
      sendError(res, 'FORBIDDEN', 'Not authorized', 403);
    }
  },

  async star(req: Request, res: Response) {
    try {
      await messagesService.star(paramId(req.params.id), req.user!.userId);
      sendSuccess(res, { starred: true });
    } catch {
      sendError(res, 'FORBIDDEN', 'Not a member', 403);
    }
  },

  async unstar(req: Request, res: Response) {
    await messagesService.unstar(paramId(req.params.id), req.user!.userId);
    sendSuccess(res, { starred: false });
  },

  async starred(req: Request, res: Response) {
    const items = await messagesService.listStarred(req.user!.userId);
    sendSuccess(res, items);
  },

  async info(req: Request, res: Response) {
    try {
      const info = await messagesService.getInfo(paramId(req.params.id), req.user!.userId);
      sendSuccess(res, info);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'NOT_FOUND') sendError(res, 'NOT_FOUND', 'Message not found', 404);
      else sendError(res, 'FORBIDDEN', 'Not a member', 403);
    }
  },

  async forward(req: Request, res: Response) {
    try {
      const message = await messagesService.forward(
        paramId(req.params.id),
        req.user!.userId,
        req.body.conversationId,
      );
      sendSuccess(res, message, 201);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'NOT_FOUND') sendError(res, 'NOT_FOUND', 'Message not found', 404);
      else sendError(res, 'FORBIDDEN', 'Not a member', 403);
    }
  },

  async pinned(req: Request, res: Response) {
    try {
      const messages = await messagesService.listPinned(paramId(req.params.id), req.user!.userId);
      sendSuccess(res, messages);
    } catch {
      sendError(res, 'FORBIDDEN', 'Not a member', 403);
    }
  },

  async markConversationRead(req: Request, res: Response) {
    try {
      const ids = await messagesService.markConversationRead(paramId(req.params.id), req.user!.userId);
      sendSuccess(res, { messageIds: ids });
    } catch {
      sendError(res, 'FORBIDDEN', 'Not a member', 403);
    }
  },
};
