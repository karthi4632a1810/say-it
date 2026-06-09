import { Router } from 'express';
import multer from 'multer';
import { filesService } from './files.service.js';
import { sendSuccess, sendError } from '../../lib/response.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

export const filesRoutes = Router();
filesRoutes.use(authenticate);

filesRoutes.post('/upload', authorize('files:upload'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    sendError(res, 'VALIDATION_ERROR', 'No file uploaded', 400);
    return;
  }
  const conversationId = req.body.conversationId as string | undefined;
  const file = await filesService.upload(req.user!.userId, req.file, conversationId);
  sendSuccess(res, file, 201);
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
