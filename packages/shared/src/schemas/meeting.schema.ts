import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  recurrenceType: z.enum(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY']).default('ONCE'),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional(),
  departmentId: z.string().uuid().optional(),
  participantIds: z.array(z.string().uuid()).min(1),
});

export const rsvpSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED', 'TENTATIVE']),
});

export const meetingNotesSchema = z.object({
  content: z.string(),
});
