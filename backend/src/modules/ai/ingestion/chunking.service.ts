export function chunkText(text: string, chunkSize = 512, overlap = 64): string[] {
  if (text.length < 400) return [text];

  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const word of words) {
    const wordLen = word.length + 1;
    if (currentLen + wordLen > chunkSize && current.length > 0) {
      chunks.push(current.join(' '));
      const overlapWords = current.slice(-Math.ceil(overlap / 5));
      current = [...overlapWords];
      currentLen = current.join(' ').length;
    }
    current.push(word);
    currentLen += wordLen;
  }

  if (current.length > 0) {
    chunks.push(current.join(' '));
  }

  return chunks.length > 0 ? chunks : [text];
}
