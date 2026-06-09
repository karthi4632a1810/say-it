import type { Response } from 'express';
import type { ApiResponse } from '@say-it/shared';

export function sendSuccess<T>(
  res: Response,
  data: T,
  status = 200,
  meta?: Record<string, unknown>,
): void {
  const body: ApiResponse<T> = { success: true, data, meta, error: null };
  res.status(status).json(body);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  status = 400,
  fields?: Record<string, string[]>,
): void {
  const body: ApiResponse<null> = {
    success: false,
    data: null,
    error: { code, message, fields },
  };
  res.status(status).json(body);
}
