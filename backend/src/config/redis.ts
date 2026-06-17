import { Redis } from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
redis.on('error', () => {
  /* ioredis emits if Redis is down; handler avoids Node process warning */
});

export const redisSubscriber = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
redisSubscriber.on('error', () => {
  /* same as redis client */
});
