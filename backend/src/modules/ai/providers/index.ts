import { env } from '../../../config/env.js';
import { GroqProvider } from './groq.provider.js';
import { OllamaProvider } from './ollama.provider.js';
import type { LLMProvider } from './llm.provider.js';

let provider: LLMProvider | null = null;

function createTextProvider(): LLMProvider {
  if (env.LLM_PROVIDER === 'groq') return new GroqProvider();
  return new OllamaProvider();
}

function createEmbeddingProvider(): LLMProvider {
  return new OllamaProvider();
}

export function getLLMProvider(): LLMProvider {
  if (!provider) {
    const textProvider = createTextProvider();
    const embedProvider = createEmbeddingProvider();
    provider = {
      generate: (prompt, systemPrompt) => textProvider.generate(prompt, systemPrompt),
      embed: (text) => embedProvider.embed(text),
    };
  }
  return provider;
}
