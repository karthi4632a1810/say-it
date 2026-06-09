import { env } from '../../../config/env.js';
import { OllamaProvider } from './ollama.provider.js';
import type { LLMProvider } from './llm.provider.js';

let provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!provider) {
    if (env.LLM_PROVIDER === 'ollama') {
      provider = new OllamaProvider();
    } else {
      provider = new OllamaProvider();
    }
  }
  return provider;
}
