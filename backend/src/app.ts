import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { corsOrigins } from './config/env.js';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';
import { minioClient, ensureBucket } from './config/minio.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './lib/response.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes, departmentsRoutes } from './modules/users/users.routes.js';
import { conversationsRoutes, messagesRoutes } from './modules/conversations/conversations.routes.js';
import { channelsRoutes } from './modules/channels/channels.routes.js';
import { filesRoutes } from './modules/files/files.routes.js';
import { meetingsRoutes } from './modules/meetings/meetings.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { announcementsRoutes } from './modules/announcements/announcements.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { callsRoutes } from './modules/calls/calls.routes.js';

export async function createApp() {
  await ensureBucket();

  const app = express();

  app.use(pinoHttp());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    sendSuccess(res, { status: 'ok', version: '1.0.0', uptime: process.uptime() });
  });

  app.get('/health/db', async (_req, res) => {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, { status: 'ok', latency: Date.now() - start });
  });

  app.get('/health/redis', async (_req, res) => {
    const start = Date.now();
    await redis.ping();
    sendSuccess(res, { status: 'ok', latency: Date.now() - start });
  });

  app.get('/health/minio', async (_req, res) => {
    await minioClient.listBuckets();
    sendSuccess(res, { status: 'ok' });
  });

  app.use('/auth', authRoutes);
  app.use('/users', usersRoutes);
  app.use('/departments', departmentsRoutes);
  app.use('/conversations', conversationsRoutes);
  app.use('/messages', messagesRoutes);
  app.use('/channels', channelsRoutes);
  app.use('/files', filesRoutes);
  app.use('/meetings', meetingsRoutes);
  app.use('/notifications', notificationsRoutes);
  app.use('/announcements', announcementsRoutes);
  app.use('/ai', aiRoutes);
  app.use('/calls', callsRoutes);

  app.use(errorHandler);

  return app;
}
