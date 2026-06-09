import { z } from 'zod';

export const sendMessageSchema = z
  .object({
    content: z.string().max(10000).optional(),
    contentType: z.enum(['TEXT', 'MARKDOWN']).default('TEXT'),
    parentMessageId: z.string().uuid().optional(),
    fileIds: z.array(z.string().uuid()).optional(),
  })
  .refine((d) => (d.content?.trim()?.length ?? 0) > 0 || (d.fileIds?.length ?? 0) > 0, {
    message: 'Message must have text or attachments',
  });

export const editMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export const reactMessageSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export const forwardMessageSchema = z.object({
  conversationId: z.string().uuid(),
});

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string().uuid()).min(1),
});

export const createDirectSchema = z.object({
  userId: z.string().uuid(),
});

export const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  departmentId: z.string().uuid(),
  isPrivate: z.boolean().default(false),
});
