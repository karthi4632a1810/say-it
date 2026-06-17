import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string().default('sayit-files'),
  MINIO_USE_SSL: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  LLM_PROVIDER: z.enum(['ollama', 'groq', 'openai']).default('ollama'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_LLM_MODEL: z.string().default('qwen3.5:latest'),
  OLLAMA_LLM_THINK: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_LLM_MODEL: z.string().default('llama-3.3-70b-versatile'),
  EMBEDDING_PROVIDER: z.enum(['ollama', 'openai']).default('ollama'),
  OLLAMA_EMBED_MODEL: z.string().default('nomic-embed-text'),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(768),
  /** Max chat attachment size in bytes (default 20 GiB). */
  MAX_UPLOAD_BYTES: z.coerce.number().default(20 * 1024 * 1024 * 1024),
  /** HTTP request timeout for large uploads (default 24h). 0 = no timeout. */
  UPLOAD_REQUEST_TIMEOUT_MS: z.coerce.number().default(24 * 60 * 60 * 1000),
  /** Comma-separated STUN URLs for WebRTC voice calls. */
  STUN_URLS: z.string().default('stun:stun.l.google.com:19302'),
  TURN_URL: z.string().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_CREDENTIAL: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

/** Comma-separated FRONTEND_URL values (e.g. localhost + LAN IP for mobile testing). */
export const corsOrigins = parsed.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean);

export const env = parsed;
