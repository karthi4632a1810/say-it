import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis.js';
import { sendError } from '../lib/response.js';

export function rateLimiter(keyPrefix: string, limit: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${keyPrefix}:${req.ip}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    if (count > limit) {
      sendError(res, 'RATE_LIMITED', 'Too many requests', 429);
      return;
    }
    next();
  };
}
