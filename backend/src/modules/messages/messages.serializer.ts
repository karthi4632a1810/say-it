/** Prisma returns BigInt for file.sizeBytes — JSON.stringify throws without this. */
type AttachmentFile = { sizeBytes?: bigint | number; [key: string]: unknown };

type MessageLike = {
  attachments?: Array<{ file?: AttachmentFile | null; [key: string]: unknown }>;
  [key: string]: unknown;
};

export function serializeMessage<T extends MessageLike>(message: T | null): T | null {
  if (!message) return null;
  if (!message.attachments?.length) return message;
  return {
    ...message,
    attachments: message.attachments.map((a) => ({
      ...a,
      file: a.file ? { ...a.file, sizeBytes: Number(a.file.sizeBytes) } : a.file,
    })),
  };
}

export function serializeMessages<T extends MessageLike>(messages: T[]): T[] {
  return messages.map((m) => serializeMessage(m)!);
}
