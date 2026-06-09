import { Router } from 'express';
import { createDirectSchema, createGroupSchema } from '@say-it/shared';
import { conversationsController } from './conversations.controller.js';
import { messagesController } from '../messages/messages.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { sendMessageSchema, editMessageSchema, reactMessageSchema, forwardMessageSchema } from '@say-it/shared';
import { z } from 'zod';

export const conversationsRoutes = Router();
conversationsRoutes.use(authenticate);

conversationsRoutes.get('/', conversationsController.list);
conversationsRoutes.post('/direct', validate({ body: createDirectSchema }), conversationsController.createDirect);
conversationsRoutes.post('/group', validate({ body: createGroupSchema }), conversationsController.createGroup);
conversationsRoutes.get('/:id', conversationsController.get);
conversationsRoutes.patch('/:id', conversationsController.update);
conversationsRoutes.get('/:id/members', conversationsController.members);
conversationsRoutes.post('/:id/members', validate({ body: z.object({ userId: z.string().uuid() }) }), conversationsController.addMember);
conversationsRoutes.delete('/:id/members/:userId', conversationsController.removeMember);
conversationsRoutes.get('/:id/messages', messagesController.list);
conversationsRoutes.post('/:id/messages', validate({ body: sendMessageSchema }), messagesController.send);
conversationsRoutes.post('/:id/read', messagesController.markConversationRead);
conversationsRoutes.get('/:id/pinned', messagesController.pinned);

export const messagesRoutes = Router();
messagesRoutes.use(authenticate);
messagesRoutes.get('/starred', messagesController.starred);
messagesRoutes.get('/:id/info', messagesController.info);
messagesRoutes.patch('/:id', validate({ body: editMessageSchema }), messagesController.edit);
messagesRoutes.delete('/:id', messagesController.delete);
messagesRoutes.post('/:id/react', validate({ body: reactMessageSchema }), messagesController.react);
messagesRoutes.delete('/:id/react/:emoji', messagesController.unreact);
messagesRoutes.post('/:id/pin', messagesController.pin);
messagesRoutes.delete('/:id/pin', messagesController.unpin);
messagesRoutes.post('/:id/star', messagesController.star);
messagesRoutes.delete('/:id/star', messagesController.unstar);
messagesRoutes.post('/:id/forward', validate({ body: forwardMessageSchema }), messagesController.forward);
