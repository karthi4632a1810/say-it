import { prisma } from '../../../config/database.js';
import { getLLMProvider } from '../providers/index.js';
import type { EmbeddingSourceType } from '@prisma/client';

export type RetrievedChunk = {
  id: string;
  sourceType: EmbeddingSourceType;
  sourceId: string;
  chunkText: string;
  metadata: Record<string, unknown> | null;
  relevanceScore: number;
};

export const retrievalService = {
  async search(
    query: string,
    options: {
      limit?: number;
      sourceTypes?: EmbeddingSourceType[];
      departmentId?: string;
    } = {},
  ): Promise<RetrievedChunk[]> {
    const provider = getLLMProvider();
    const queryVector = await provider.embed(query);
    const vectorStr = `[${queryVector.join(',')}]`;
    const limit = options.limit ?? 5;

    let typeFilter = '';
    if (options.sourceTypes?.length) {
      const types = options.sourceTypes.map((t) => `'${t}'`).join(',');
      typeFilter = `AND source_type IN (${types})`;
    }

    const results = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        source_type: EmbeddingSourceType;
        source_id: string;
        chunk_text: string;
        metadata: Record<string, unknown> | null;
        score: number;
      }>
    >(
      `SELECT id, source_type, source_id, chunk_text, metadata,
              1 - (embedding <=> $1::vector) AS score
       FROM embeddings
       WHERE 1=1 ${typeFilter}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      vectorStr,
      limit * 4,
    );

    const filtered = results
      .filter((r) => r.score >= 0.5)
      .slice(0, limit);

    if (options.departmentId) {
      return filtered
        .filter((r) => {
          const meta = r.metadata as Record<string, unknown> | null;
          return !meta?.departmentId || meta.departmentId === options.departmentId;
        })
        .map(mapRow);
    }

    return filtered.map(mapRow);
  },
};

function mapRow(r: {
  id: string;
  source_type: EmbeddingSourceType;
  source_id: string;
  chunk_text: string;
  metadata: Record<string, unknown> | null;
  score: number;
}): RetrievedChunk {
  return {
    id: r.id,
    sourceType: r.source_type,
    sourceId: r.source_id,
    chunkText: r.chunk_text,
    metadata: r.metadata,
    relevanceScore: r.score,
  };
}
