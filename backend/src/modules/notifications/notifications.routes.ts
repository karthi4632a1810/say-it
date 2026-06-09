import { Router } from 'express';
import { notificationsService } from './notifications.service.js';
import { sendSuccess } from '../../lib/response.js';
import { authenticate } from '../../middleware/authenticate.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

export const notificationsRoutes = Router();
notificationsRoutes.use(authenticate);

notificationsRoutes.get('/', async (req, res) => {
  const notifications = await notificationsService.list(req.user!.userId);
  const unreadCount = await notificationsService.unreadCount(req.user!.userId);
  sendSuccess(res, notifications, 200, { unreadCount });
});

notificationsRoutes.post('/read', validate({ body: z.object({ ids: z.array(z.string().uuid()) }) }), async (req, res) => {
  await notificationsService.markRead(req.user!.userId, req.body.ids);
  sendSuccess(res, { marked: true });
});

notificationsRoutes.post('/:id/read', async (req, res) => {
  await notificationsService.markOneRead(req.user!.userId, req.params.id!);
  sendSuccess(res, { marked: true });
});
