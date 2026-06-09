import { Router } from 'express';
import { createMeetingSchema, rsvpSchema, meetingNotesSchema } from '@say-it/shared';
import { meetingsService } from './meetings.service.js';
import { sendSuccess, sendError } from '../../lib/response.js';
import { paramId } from '../../lib/params.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

export const meetingsRoutes = Router();
meetingsRoutes.use(authenticate);

meetingsRoutes.get('/', async (req, res) => {
  const meetings = await meetingsService.list(req.user!.userId);
  sendSuccess(res, meetings);
});

meetingsRoutes.post('/', validate({ body: createMeetingSchema }), async (req, res) => {
  const meeting = await meetingsService.create(req.user!.userId, req.body);
  sendSuccess(res, meeting, 201);
});

meetingsRoutes.get('/:id', async (req, res) => {
  try {
    const meeting = await meetingsService.get(paramId(req.params.id), req.user!.userId);
    sendSuccess(res, meeting);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'NOT_FOUND') sendError(res, 'NOT_FOUND', 'Meeting not found', 404);
    else sendError(res, 'FORBIDDEN', 'Access denied', 403);
  }
});

meetingsRoutes.post('/:id/rsvp', validate({ body: rsvpSchema }), async (req, res) => {
  const result = await meetingsService.rsvp(paramId(req.params.id), req.user!.userId, req.body.status);
  sendSuccess(res, result);
});

meetingsRoutes.get('/:id/notes', async (req, res) => {
  try {
    const meeting = await meetingsService.get(paramId(req.params.id), req.user!.userId);
    sendSuccess(res, meeting.notes);
  } catch {
    sendError(res, 'FORBIDDEN', 'Access denied', 403);
  }
});

meetingsRoutes.put('/:id/notes', validate({ body: meetingNotesSchema }), async (req, res) => {
  try {
    const notes = await meetingsService.saveNotes(paramId(req.params.id), req.user!.userId, req.body.content);
    sendSuccess(res, notes);
  } catch {
    sendError(res, 'FORBIDDEN', 'Not authorized', 403);
  }
});

meetingsRoutes.post('/:id/attendance', validate({ body: z.object({ attendance: z.array(z.object({ userId: z.string().uuid(), attended: z.boolean() })) }) }), async (req, res) => {
  try {
    await meetingsService.markAttendance(paramId(req.params.id), req.user!.userId, req.body.attendance);
    sendSuccess(res, { updated: true });
  } catch {
    sendError(res, 'FORBIDDEN', 'Not authorized', 403);
  }
});
