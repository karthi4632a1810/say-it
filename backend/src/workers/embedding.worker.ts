import { embeddingQueue } from './queue.js';
import { embeddingService } from '../modules/ai/ingestion/embedding.service.js';
import type { EmbeddingSourceType } from '@prisma/client';
import pino from 'pino';

const logger = pino({ name: 'embedding-worker' });

export function startEmbeddingWorker(): void {
  embeddingQueue.process('ingest', async (job) => {
    const { sourceType, sourceId, text, metadata } = job.data as {
      sourceType: EmbeddingSourceType;
      sourceId: string;
      text: string;
      metadata?: Record<string, unknown>;
    };

    logger.info({ sourceType, sourceId }, 'Ingesting embedding');
    await embeddingService.ingest({ sourceType, sourceId, text, metadata });
  });

  embeddingQueue.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Embedding job failed');
  });
}
