import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { v4 as uuid } from 'uuid';
import { prisma } from '../../config/database.js';
import { minioClient } from '../../config/minio.js';
import { env } from '../../config/env.js';
import { conversationsService } from '../conversations/conversations.service.js';
import { embeddingQueue } from '../../workers/queue.js';

const GIPHY_URL_PATTERN = /^https:\/\/(?:media\d?\.|i\.)?giphy\.com\/.+/i;
const MAX_GIPHY_BYTES = 25 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, '_').replace(/\s+/g, '_').slice(0, 120) || 'giphy';
}

export const filesService = {
  async upload(userId: string, file: Express.Multer.File, conversationId?: string) {
    if (conversationId) {
      await conversationsService.assertMember(conversationId, userId);
    }

    const storageKey = `${userId}/${uuid()}/${file.originalname}`;

    try {
      const body = file.path ? createReadStream(file.path) : file.buffer;
      await minioClient.putObject(env.MINIO_BUCKET, storageKey, body, file.size, {
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
        try {
          await embeddingQueue.add('ingest', {
            sourceType: 'FILE',
            sourceId: record.id,
            text: `[File: ${file.originalname}]`,
            metadata: { conversationId, mimeType: file.mimetype },
          });
        } catch {
          // Upload should succeed even if the embedding queue is unavailable
        }
      }

      return formatFile(record);
    } finally {
      if (file.path) {
        await unlink(file.path).catch(() => {});
      }
    }
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

  async getContentStream(id: string, userId: string) {
    const record = await prisma.file.findUnique({ where: { id } });
    if (!record || record.isDeleted) throw new Error('NOT_FOUND');
    if (record.conversationId) {
      await conversationsService.assertMember(record.conversationId, userId);
    } else if (record.uploadedBy !== userId) {
      throw new Error('FORBIDDEN');
    }
    const stream = await minioClient.getObject(record.bucketName, record.storageKey);
    return {
      stream,
      mimeType: record.mimeType,
      originalName: record.originalName,
      sizeBytes: Number(record.sizeBytes),
    };
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

  async importGiphy(
    userId: string,
    data: { url: string; giphyId: string; title?: string; conversationId?: string },
  ) {
    if (!GIPHY_URL_PATTERN.test(data.url)) {
      throw new Error('INVALID_URL');
    }
    if (data.conversationId) {
      await conversationsService.assertMember(data.conversationId, userId);
    }

    const res = await fetch(data.url, { redirect: 'follow' });
    if (!res.ok) throw new Error('FETCH_FAILED');

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_GIPHY_BYTES) throw new Error('FILE_TOO_LARGE');

    const headerType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    const urlLower = data.url.toLowerCase();
    let mimeType = 'image/gif';
    let ext = 'gif';
    if (headerType.includes('mp4') || urlLower.endsWith('.mp4')) {
      mimeType = 'video/mp4';
      ext = 'mp4';
    } else if (headerType.startsWith('image/')) {
      mimeType = headerType;
      ext = mimeType.split('/')[1] || 'gif';
    } else if (urlLower.endsWith('.webp')) {
      mimeType = 'image/webp';
      ext = 'webp';
    }

    const baseName = sanitizeFileName(data.title?.trim() || `giphy-${data.giphyId}`);
    const originalName = `${baseName}.${ext}`;
    const storageKey = `${userId}/${uuid()}/${originalName}`;

    await minioClient.putObject(env.MINIO_BUCKET, storageKey, buffer, buffer.length, {
      'Content-Type': mimeType,
    });

    const record = await prisma.file.create({
      data: {
        name: originalName,
        originalName,
        mimeType,
        sizeBytes: BigInt(buffer.length),
        storageKey,
        bucketName: env.MINIO_BUCKET,
        uploadedBy: userId,
        conversationId: data.conversationId,
      },
    });

    if (data.conversationId) {
      try {
        await embeddingQueue.add('ingest', {
          sourceType: 'FILE',
          sourceId: record.id,
          text: `[GIF: ${originalName}]`,
          metadata: { conversationId: data.conversationId, mimeType, giphyId: data.giphyId },
        });
      } catch {
        // Upload should succeed even if the embedding queue is unavailable
      }
    }

    return formatFile(record);
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
