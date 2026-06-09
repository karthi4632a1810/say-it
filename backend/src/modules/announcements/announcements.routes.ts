import { Router } from 'express';
import { createAnnouncementSchema } from '@say-it/shared';
import { announcementsService } from './announcements.service.js';
import { sendSuccess } from '../../lib/response.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

export const announcementsRoutes = Router();
announcementsRoutes.use(authenticate);

announcementsRoutes.get('/', async (req, res) => {
  const announcements = await announcementsService.list(req.user!.userId);
  sendSuccess(res, announcements);
});

announcementsRoutes.post('/', authorize('announcements:create'), validate({ body: createAnnouncementSchema }), async (req, res) => {
  const announcement = await announcementsService.create(req.user!.userId, req.body);
  sendSuccess(res, announcement, 201);
});

announcementsRoutes.post('/:id/read', async (req, res) => {
  await announcementsService.markRead(req.params.id!, req.user!.userId);
  sendSuccess(res, { read: true });
});
