import { Router } from 'express';
import { createChannelSchema } from '@say-it/shared';
import { conversationsService } from '../conversations/conversations.service.js';
import { sendSuccess, sendError } from '../../lib/response.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../config/database.js';
import { paramId } from '../../lib/params.js';
import { conversationsRepository } from '../conversations/conversations.repository.js';

export const channelsRoutes = Router();
channelsRoutes.use(authenticate);

channelsRoutes.get('/', async (req, res) => {
  const channels = await prisma.conversation.findMany({
    where: {
      type: 'CHANNEL',
      OR: [
        { isPrivate: false },
        { members: { some: { userId: req.user!.userId } } },
      ],
    },
    include: { department: true },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, channels);
});

channelsRoutes.post('/', authorize('channels:create'), validate({ body: createChannelSchema }), async (req, res) => {
  const channel = await conversationsService.createChannel(req.user!.userId, req.body);
  sendSuccess(res, channel, 201);
});

channelsRoutes.post('/:id/join', async (req, res) => {
  const channelId = paramId(req.params.id);
  const channel = await prisma.conversation.findUnique({ where: { id: channelId } });
  if (!channel || channel.type !== 'CHANNEL' || channel.isPrivate) {
    sendError(res, 'FORBIDDEN', 'Cannot join this channel', 403);
    return;
  }
  await conversationsRepository.addMember(channelId, req.user!.userId);
  sendSuccess(res, { joined: true });
});
