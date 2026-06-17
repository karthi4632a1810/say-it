/** True when an upstream LLM/embeddings HTTP call could not connect (Ollama down, etc.). */
export function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  const cause = (err as Error & { cause?: unknown }).cause;
  const causeMsg = cause instanceof Error ? cause.message.toLowerCase() : String(cause ?? '').toLowerCase();

  return (
    msg.includes('fetch failed')
    || msg.includes('cannot reach ollama')
    || msg.includes('econnrefused')
    || msg.includes('enotfound')
    || msg.includes('etimedout')
    || msg.includes('network')
    || causeMsg.includes('econnrefused')
    || causeMsg.includes('connect')
  );
}

export function formatAiError(err: unknown): string {
  if (!(err instanceof Error)) return 'AI service error';

  if (isConnectionError(err)) {
    return 'Embeddings service (Ollama) is not reachable. Start Ollama and run: ollama pull nomic-embed-text';
  }

  if (err.message.includes('GROQ_API_KEY')) {
    return 'Groq API key is missing. Set GROQ_API_KEY in backend/.env';
  }

  if (err.message.startsWith('Groq generate failed')) {
    return `Answer generation failed: ${err.message}`;
  }

  if (err.message.startsWith('Ollama embed failed')) {
    return `Embeddings failed: ${err.message}. Run: ollama pull nomic-embed-text`;
  }

  return err.message;
}
