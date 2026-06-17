import { prisma } from '../../../config/database.js';
import { getLLMProvider } from '../providers/index.js';
import { isConnectionError } from '../lib/ai-errors.js';
import type { EmbeddingSourceType } from '@prisma/client';
import pino from 'pino';

const logger = pino({ name: 'retrieval' });

export type RetrievedChunk = {
  id: string;
  sourceType: EmbeddingSourceType;
  sourceId: string;
  chunkText: string;
  metadata: Record<string, unknown> | null;
  relevanceScore: number;
};

type SearchOptions = {
  limit?: number;
  sourceTypes?: EmbeddingSourceType[];
  departmentId?: string;
};

export const retrievalService = {
  async search(query: string, options: SearchOptions = {}): Promise<RetrievedChunk[]> {
    try {
      return await vectorSearch(query, options);
    } catch (err) {
      if (isConnectionError(err)) {
        logger.warn({ err }, 'Vector search unavailable — falling back to text search');
        return lexicalSearch(query, options);
      }
      throw err;
    }
  },
};

async function vectorSearch(query: string, options: SearchOptions): Promise<RetrievedChunk[]> {
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

  return applyDepartmentFilter(filtered, options.departmentId).map(mapRow);
}

async function lexicalSearch(query: string, options: SearchOptions): Promise<RetrievedChunk[]> {
  const limit = options.limit ?? 5;
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 8);

  if (terms.length === 0) return [];

  let typeFilter = '';
  if (options.sourceTypes?.length) {
    const types = options.sourceTypes.map((t) => `'${t}'`).join(',');
    typeFilter = `AND source_type IN (${types})`;
  }

  const likeClauses = terms.map((_, i) => `chunk_text ILIKE $${i + 1}`).join(' OR ');
  const params = terms.map((t) => `%${t}%`);

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      source_type: EmbeddingSourceType;
      source_id: string;
      chunk_text: string;
      metadata: Record<string, unknown> | null;
    }>
  >(
    `SELECT id, source_type, source_id, chunk_text, metadata
     FROM embeddings
     WHERE (${likeClauses}) ${typeFilter}
     ORDER BY length(chunk_text) ASC
     LIMIT $${params.length + 1}`,
    ...params,
    limit * 4,
  );

  const scored = results.map((r) => {
    const lower = r.chunk_text.toLowerCase();
    const hits = terms.filter((t) => lower.includes(t.toLowerCase())).length;
    return { ...r, score: hits / terms.length };
  });

  scored.sort((a, b) => b.score - a.score);

  return applyDepartmentFilter(
    scored.filter((r) => r.score > 0).slice(0, limit),
    options.departmentId,
  ).map(mapRow);
}

function applyDepartmentFilter<T extends { metadata: Record<string, unknown> | null }>(
  rows: T[],
  departmentId?: string,
): T[] {
  if (!departmentId) return rows;
  return rows.filter((r) => {
    const meta = r.metadata as Record<string, unknown> | null;
    return !meta?.departmentId || meta.departmentId === departmentId;
  });
}

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
