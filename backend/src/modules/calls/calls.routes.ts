import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../lib/response.js';
import { getIceServers } from '../../lib/iceServers.js';

export const callsRoutes = Router();
callsRoutes.use(authenticate);

callsRoutes.get('/ice-servers', (_req, res) => {
  sendSuccess(res, { iceServers: getIceServers() });
});
