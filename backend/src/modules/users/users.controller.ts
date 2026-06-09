import type { Request, Response } from 'express';
import { usersService } from './users.service.js';
import { sendSuccess, sendError } from '../../lib/response.js';
import { paramId } from '../../lib/params.js';

export const usersController = {
  async me(req: Request, res: Response) {
    try {
      const user = await usersService.getMe(req.user!.userId);
      sendSuccess(res, user);
    } catch {
      sendError(res, 'NOT_FOUND', 'User not found', 404);
    }
  },

  async updateMe(req: Request, res: Response) {
    const user = await usersService.updateProfile(req.user!.userId, req.body);
    sendSuccess(res, user);
  },

  async uploadAvatar(req: Request, res: Response) {
    if (!req.file) {
      sendError(res, 'VALIDATION_ERROR', 'No file uploaded', 400);
      return;
    }
    const result = await usersService.uploadAvatar(req.user!.userId, req.file);
    sendSuccess(res, result);
  },

  async directory(req: Request, res: Response) {
    const q = (req.query.q as string) ?? '';
    const users = await usersService.searchDirectory(q);
    sendSuccess(res, users);
  },

  async getById(req: Request, res: Response) {
    try {
      const user = await usersService.getProfile(paramId(req.params.id));
      sendSuccess(res, user);
    } catch {
      sendError(res, 'NOT_FOUND', 'User not found', 404);
    }
  },

  async presence(req: Request, res: Response) {
    const result = await usersService.getPresence(paramId(req.params.id));
    sendSuccess(res, result);
  },

  async departments(_req: Request, res: Response) {
    const depts = await usersService.listDepartments();
    sendSuccess(res, depts);
  },

  async departmentMembers(req: Request, res: Response) {
    const members = await usersService.listDepartmentMembers(paramId(req.params.id));
    sendSuccess(res, members);
  },
};
