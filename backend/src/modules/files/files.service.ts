import { v4 as uuid } from 'uuid';
import { prisma } from '../../config/database.js';
import { minioClient } from '../../config/minio.js';
import { env } from '../../config/env.js';
import { conversationsService } from '../conversations/conversations.service.js';
import { embeddingQueue } from '../../workers/queue.js';

export const filesService = {
  async upload(userId: string, file: Express.Multer.File, conversationId?: string) {
    if (conversationId) {
      await conversationsService.assertMember(conversationId, userId);
    }

    const storageKey = `${userId}/${uuid()}/${file.originalname}`;
    await minioClient.putObject(env.MINIO_BUCKET, storageKey, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const record = await prisma.file.create({
      data: {
        name: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        storageKey,
        bucketName: env.MINIO_BUCKET,
        uploadedBy: userId,
        conversationId,
      },
    });

    if (conversationId) {
      await embeddingQueue.add('ingest', {
        sourceType: 'FILE',
        sourceId: record.id,
        text: `[File: ${file.originalname}]`,
        metadata: { conversationId, mimeType: file.mimetype },
      });
    }

    return formatFile(record);
  },

  async get(id: string, userId: string) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file || file.isDeleted) throw new Error('NOT_FOUND');
    if (file.conversationId) {
      await conversationsService.assertMember(file.conversationId, userId);
    } else if (file.uploadedBy !== userId) {
      throw new Error('FORBIDDEN');
    }
    return formatFile(file);
  },

  async getDownloadUrl(id: string, userId: string) {
    const file = await this.get(id, userId);
    const url = await minioClient.presignedGetObject(env.MINIO_BUCKET, file.storageKey, 15 * 60);
    return { url, expiresIn: 900 };
  },

  async listByConversation(conversationId: string, userId: string) {
    await conversationsService.assertMember(conversationId, userId);
    const files = await prisma.file.findMany({
      where: { conversationId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
    return files.map(formatFile);
  },

  async delete(id: string, userId: string) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) throw new Error('NOT_FOUND');
    if (file.uploadedBy !== userId) throw new Error('FORBIDDEN');
    await prisma.file.update({ where: { id }, data: { isDeleted: true } });
  },
};

function formatFile(file: { id: string; name: string; originalName: string; mimeType: string; sizeBytes: bigint; storageKey: string; version: number; createdAt: Date }) {
  return {
    id: file.id,
    name: file.name,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: Number(file.sizeBytes),
    storageKey: file.storageKey,
    version: file.version,
    createdAt: file.createdAt,
  };
}
