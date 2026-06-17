import { env } from '../../../config/env.js';
import type { LLMProvider } from './llm.provider.js';

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private llmModel: string;
  private embedModel: string;
  private think: boolean;

  constructor() {
    this.baseUrl = env.OLLAMA_BASE_URL;
    this.llmModel = env.OLLAMA_LLM_MODEL;
    this.embedModel = env.OLLAMA_EMBED_MODEL;
    this.think = env.OLLAMA_LLM_THINK;
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.llmModel,
        prompt: fullPrompt,
        stream: false,
        think: this.think,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama generate failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as { response?: string };
    return data.response?.trim() ?? '';
  }

  async embed(text: string): Promise<number[]> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embedModel,
          prompt: text,
        }),
      });
    } catch (err) {
      throw new Error(
        `Cannot reach Ollama at ${this.baseUrl}. Start Ollama and run: ollama pull ${this.embedModel}`,
        { cause: err },
      );
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama embed failed: ${response.status} ${errText}`);
    }

    const data = (await response.json()) as { embedding?: number[] };
    if (!data.embedding?.length) {
      throw new Error('Ollama returned empty embedding');
    }
    return data.embedding;
  }
}
