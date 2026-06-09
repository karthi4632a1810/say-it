import { z } from 'zod';

export const aiSearchSchema = z.object({
  query: z.string().min(1).max(1000),
  filters: z
    .object({
      sourceTypes: z.array(z.enum(['MESSAGE', 'FILE', 'ANNOUNCEMENT', 'MEETING_NOTE'])).optional(),
      departmentId: z.string().uuid().optional(),
      dateFrom: z.string().optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

export const summarizeConversationSchema = z.object({
  conversationId: z.string().uuid(),
  messageLimit: z.number().int().min(10).max(200).default(100),
});

export const summarizeMeetingSchema = z.object({
  meetingId: z.string().uuid(),
});
