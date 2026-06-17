import { prisma } from '../../../config/database.js';
import { getLLMProvider } from '../providers/index.js';
import { retrievalService } from './retrieval.service.js';
import type { EmbeddingSourceType } from '@prisma/client';

const SYSTEM_PROMPT = `You are an enterprise knowledge assistant for Say IT.
Answer questions based ONLY on the provided context.
If the context doesn't contain the answer, say "I don't have information about that in the company's knowledge base."
Always cite your sources using [Source: {source_id}] notation.`;

export const searchService = {
  async search(
    userId: string,
    query: string,
    filters?: {
      sourceTypes?: EmbeddingSourceType[];
      departmentId?: string;
      dateFrom?: string;
    },
    limit = 5,
  ) {
    const chunks = await retrievalService.search(query, {
      limit,
      sourceTypes: filters?.sourceTypes,
      departmentId: filters?.departmentId,
    });

    if (chunks.length === 0) {
      const answer = "I don't have information about that in the company's knowledge base.";
      await saveSearchHistory(userId, query, answer);
      return { answer, citations: [] };
    }

    const context = chunks
      .map((c, i) => `[${i + 1}] Source: ${c.sourceId} (${c.sourceType})\n${c.chunkText}`)
      .join('\n\n---\n\n');

    const userPrompt = `Context:\n---\n${context}\n---\n\nQuestion: ${query}\n\nAnswer with citations:`;

    const provider = getLLMProvider();
    const answer = await provider.generate(userPrompt, SYSTEM_PROMPT);

    const citations = await Promise.all(
      chunks.map(async (c) => {
        let fileName: string | undefined;
        if (c.sourceType === 'FILE') {
          const file = await prisma.file.findUnique({ where: { id: c.sourceId } });
          fileName = file?.originalName;
        }
        return {
          sourceType: c.sourceType,
          sourceId: c.sourceId,
          fileName,
          chunkText: c.chunkText.slice(0, 300),
          relevanceScore: c.relevanceScore,
        };
      }),
    );

    await saveSearchHistory(userId, query, answer);

    return { answer, citations };
  },

  searchHistory(userId: string) {
    return prisma.aiSearchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  },
};

async function saveSearchHistory(userId: string, query: string, answer: string): Promise<void> {
  try {
    await prisma.aiSearchHistory.create({ data: { userId, query, answer } });
  } catch {
    // History is non-critical; don't fail the search response
  }
}
