export * from './constants.js';
export * from './schemas/auth.schema.js';
export * from './schemas/message.schema.js';
export * from './schemas/ai.schema.js';
export * from './schemas/meeting.schema.js';
export * from './schemas/announcement.schema.js';

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  meta?: Record<string, unknown>;
  error: { code: string; message: string; fields?: Record<string, string[]> } | null;
};
