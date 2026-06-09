import type { Request, Response } from 'express';
import { conversationsService } from './conversations.service.js';
import { sendSuccess, sendError } from '../../lib/response.js';
import { paramId } from '../../lib/params.js';

export const conversationsController = {
  async list(req: Request, res: Response) {
    const convs = await conversationsService.list(req.user!.userId);
    sendSuccess(res, convs);
  },

  async get(req: Request, res: Response) {
    try {
      const conv = await conversationsService.get(paramId(req.params.id), req.user!.userId);
      sendSuccess(res, conv);
    } catch {
      sendError(res, 'FORBIDDEN', 'Not a member', 403);
    }
  },

  async createDirect(req: Request, res: Response) {
    const conv = await conversationsService.createDirect(req.user!.userId, req.body.userId);
    sendSuccess(res, conv, 201);
  },

  async createGroup(req: Request, res: Response) {
    const { name, description, memberIds } = req.body;
    const conv = await conversationsService.createGroup(req.user!.userId, name, description, memberIds);
    sendSuccess(res, conv, 201);
  },

  async update(req: Request, res: Response) {
    try {
      const conv = await conversationsService.update(paramId(req.params.id), req.user!.userId, req.body);
      sendSuccess(res, conv);
    } catch {
      sendError(res, 'FORBIDDEN', 'Not authorized', 403);
    }
  },

  async members(req: Request, res: Response) {
    try {
      const members = await conversationsService.listMembers(paramId(req.params.id), req.user!.userId);
      sendSuccess(res, members);
    } catch {
      sendError(res, 'FORBIDDEN', 'Not a member', 403);
    }
  },

  async addMember(req: Request, res: Response) {
    try {
      await conversationsService.addMember(paramId(req.params.id), req.user!.userId, req.body.userId);
      sendSuccess(res, { added: true });
    } catch {
      sendError(res, 'FORBIDDEN', 'Not authorized', 403);
    }
  },

  async removeMember(req: Request, res: Response) {
    try {
      await conversationsService.removeMember(paramId(req.params.id), req.user!.userId, paramId(req.params.userId));
      sendSuccess(res, { removed: true });
    } catch {
      sendError(res, 'FORBIDDEN', 'Not authorized', 403);
    }
  },
};
