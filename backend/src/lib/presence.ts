import { redis } from '../config/redis.js';

const PRESENCE_TTL = 90;

export async function setPresence(userId: string, status: string): Promise<void> {
  await redis.setex(`presence:${userId}`, PRESENCE_TTL, status);
  if (status !== 'offline') {
    await redis.sadd('presence:active', userId);
  } else {
    await redis.srem('presence:active', userId);
  }
}

export async function getPresence(userId: string): Promise<string> {
  const status = await redis.get(`presence:${userId}`);
  return status ?? 'offline';
}

export async function getActiveUsers(): Promise<string[]> {
  return redis.smembers('presence:active');
}
