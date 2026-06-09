export interface LLMProvider {
  generate(prompt: string, systemPrompt?: string): Promise<string>;
  embed(text: string): Promise<number[]>;
}
