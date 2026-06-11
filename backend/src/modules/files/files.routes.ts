import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { filesService } from './files.service.js';
import { sendSuccess, sendError } from '../../lib/response.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { env } from '../../config/env.js';

const importGiphySchema = z.object({
  url: z.string().url(),
  giphyId: z.string().min(1).max(64),
  title: z.string().max(200).optional(),
  conversationId: z.string().uuid().optional(),
});

const uploadDir = join(tmpdir(), 'sayit-uploads');
mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${uuid()}-${file.originalname}`),
  }),
  limits: { fileSize: env.MAX_UPLOAD_BYTES },
});

function formatGiB(bytes: number): string {
  return `${(bytes / (1024 ** 3)).toFixed(0)} GB`;
}

function handleUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        sendError(
          res,
          'VALIDATION_ERROR',
          `File exceeds the ${formatGiB(env.MAX_UPLOAD_BYTES)} upload limit`,
          413,
        );
        return;
      }
      sendError(res, 'VALIDATION_ERROR', err.message, 400);
      return;
    }
    if (err) {
      next(err as Error);
      return;
    }
    next();
  });
}

export const filesRoutes = Router();
filesRoutes.use(authenticate);

filesRoutes.post(
  '/import-giphy',
  authorize('files:upload'),
  validate({ body: importGiphySchema }),
  async (req, res) => {
    try {
      const { url, giphyId, title, conversationId } = req.body as z.infer<typeof importGiphySchema>;
      const file = await filesService.importGiphy(req.user!.userId, {
        url,
        giphyId,
        title,
        conversationId,
      });
      sendSuccess(res, file, 201);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'FORBIDDEN') sendError(res, 'FORBIDDEN', 'Not a member of this conversation', 403);
      else if (msg === 'INVALID_URL') sendError(res, 'VALIDATION_ERROR', 'Only Giphy media URLs are allowed', 400);
      else if (msg === 'FETCH_FAILED') sendError(res, 'UPLOAD_FAILED', 'Could not download GIF from Giphy', 502);
      else if (msg === 'FILE_TOO_LARGE') sendError(res, 'VALIDATION_ERROR', 'GIF exceeds size limit', 413);
      else sendError(res, 'UPLOAD_FAILED', msg || 'GIF import failed', 500);
    }
  },
);

filesRoutes.post('/upload', authorize('files:upload'), handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      sendError(res, 'VALIDATION_ERROR', 'No file uploaded', 400);
      return;
    }
    const conversationId = req.body.conversationId as string | undefined;
    const file = await filesService.upload(req.user!.userId, req.file, conversationId);
    sendSuccess(res, file, 201);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'FORBIDDEN') sendError(res, 'FORBIDDEN', 'Not a member of this conversation', 403);
    else sendError(res, 'UPLOAD_FAILED', msg || 'Upload failed', 500);
  }
});

filesRoutes.get('/:id/content', async (req, res) => {
  try {
    const { stream, mimeType, originalName } = await filesService.getContentStream(req.params.id!, req.user!.userId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
    stream.on('error', () => {
      if (!res.headersSent) sendError(res, 'NOT_FOUND', 'File not found', 404);
    });
    stream.pipe(res);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'NOT_FOUND') sendError(res, 'NOT_FOUND', 'File not found', 404);
    else sendError(res, 'FORBIDDEN', 'Access denied', 403);
  }
});

filesRoutes.get('/:id', async (req, res) => {
  try {
    const file = await filesService.get(req.params.id!, req.user!.userId);
    sendSuccess(res, file);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'NOT_FOUND') sendError(res, 'NOT_FOUND', 'File not found', 404);
    else sendError(res, 'FORBIDDEN', 'Access denied', 403);
  }
});

filesRoutes.get('/:id/download', async (req, res) => {
  try {
    const result = await filesService.getDownloadUrl(req.params.id!, req.user!.userId);
    sendSuccess(res, result);
  } catch {
    sendError(res, 'FORBIDDEN', 'Access denied', 403);
  }
});

filesRoutes.delete('/:id', async (req, res) => {
  try {
    await filesService.delete(req.params.id!, req.user!.userId);
    sendSuccess(res, { deleted: true });
  } catch {
    sendError(res, 'FORBIDDEN', 'Not authorized', 403);
  }
});
