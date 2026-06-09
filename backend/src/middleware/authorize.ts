import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../lib/response.js';

export function authorize(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
      return;
    }
    const hasPermission = permissions.some((p) => req.user!.permissions.includes(p));
    const isAdmin = req.user.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    if (!hasPermission && !isAdmin) {
      sendError(res, 'FORBIDDEN', 'Insufficient permissions', 403);
      return;
    }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
      return;
    }
    const hasRole = req.user.roles.some((r) => roles.includes(r));
    if (!hasRole) {
      sendError(res, 'FORBIDDEN', 'Insufficient role', 403);
      return;
    }
    next();
  };
}
