import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  type: z.enum(['COMPANY', 'DEPARTMENT', 'EMERGENCY']).default('COMPANY'),
  departmentId: z.string().uuid().optional(),
  isEmergency: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
});
