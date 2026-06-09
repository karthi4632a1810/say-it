import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { sendError } from '../lib/response.js';

const logger = pino({ name: 'error-handler' });

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error(err);
  sendError(res, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
}
