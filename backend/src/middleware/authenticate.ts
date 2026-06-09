import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt.js';
import { sendError } from '../lib/response.js';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    sendError(res, 'UNAUTHORIZED', 'Missing or invalid authorization header', 401);
    return;
  }
  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    sendError(res, 'UNAUTHORIZED', 'Invalid or expired token', 401);
  }
}
