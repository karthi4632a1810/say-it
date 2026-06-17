import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis, redisSubscriber } from '../config/redis.js';
import { corsOrigins } from '../config/env.js';
import { socketAuth } from './socket.middleware.js';
import { joinUserRooms, registerPresenceHandlers } from './handlers/presence.handler.js';
import { registerMessageHandlers } from './handlers/message.handler.js';
import { registerTypingHandlers } from './handlers/typing.handler.js';
import { registerCallHandlers } from './handlers/call.handler.js';

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.adapter(createAdapter(redis, redisSubscriber));
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    await joinUserRooms(socket);
    registerPresenceHandlers(io, socket);
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerCallHandlers(io, socket);
  });

  return io;
}
