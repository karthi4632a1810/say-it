import { env } from '../../../config/env.js';
import type { LLMProvider } from './llm.provider.js';

export class GroqProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private readonly baseUrl = 'https://api.groq.com/openai/v1';

  constructor() {
    if (!env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is required when LLM_PROVIDER=groq');
    }
    this.apiKey = env.GROQ_API_KEY;
    this.model = env.GROQ_LLM_MODEL;
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq generate failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error('Groq does not support embeddings. Set EMBEDDING_PROVIDER=ollama.');
  }
}
