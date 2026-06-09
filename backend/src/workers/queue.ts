import Bull from 'bull';
import { env } from '../config/env.js';

export const embeddingQueue = new Bull('embedding', env.REDIS_URL);
