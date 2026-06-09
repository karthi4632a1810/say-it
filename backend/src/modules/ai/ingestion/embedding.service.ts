import { prisma } from '../../../config/database.js';
import { getLLMProvider } from '../providers/index.js';
import { chunkText } from './chunking.service.js';
import type { EmbeddingSourceType } from '@prisma/client';

export const embeddingService = {
  async ingest(data: {
    sourceType: EmbeddingSourceType;
    sourceId: string;
    text: string;
    metadata?: Record<string, unknown>;
  }) {
    const provider = getLLMProvider();
    const chunks = chunkText(data.text);

    await prisma.$executeRaw`DELETE FROM embeddings WHERE source_type = ${data.sourceType}::"EmbeddingSourceType" AND source_id = ${data.sourceId}`;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const vector = await provider.embed(chunk);
      const vectorStr = `[${vector.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO embeddings (id, source_type, source_id, chunk_index, chunk_text, embedding, metadata, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          ${data.sourceType}::"EmbeddingSourceType",
          ${data.sourceId},
          ${i},
          ${chunk},
          ${vectorStr}::vector,
          ${JSON.stringify(data.metadata ?? {})}::jsonb,
          NOW(),
          NOW()
        )
      `;
    }
  },
};
