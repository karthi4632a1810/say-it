import { Router } from 'express';
import { aiSearchSchema, summarizeConversationSchema, summarizeMeetingSchema } from '@say-it/shared';
import { searchService } from './search/search.service.js';
import { summarizationService } from './summarization/summarization.service.js';
import { sendSuccess, sendError } from '../../lib/response.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { formatAiError } from './lib/ai-errors.js';

export const aiRoutes = Router();
aiRoutes.use(authenticate);

aiRoutes.post('/search', authorize('ai:search'), validate({ body: aiSearchSchema }), async (req, res) => {
  try {
    const { query, filters, limit } = req.body;
    const result = await searchService.search(req.user!.userId, query, filters, limit);
    sendSuccess(res, result);
  } catch (err) {
    sendError(res, 'AI_ERROR', formatAiError(err), 503);
  }
});

aiRoutes.post('/summarize/conversation', authorize('ai:summarize'), validate({ body: summarizeConversationSchema }), async (req, res) => {
  try {
    const summary = await summarizationService.summarizeConversation(
      req.user!.userId,
      req.body.conversationId,
      req.body.messageLimit,
    );
    sendSuccess(res, { summary });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'NOT_FOUND' || msg.includes('member')) {
      sendError(res, 'FORBIDDEN', 'Not a member', 403);
      return;
    }
    sendError(res, 'AI_ERROR', formatAiError(err), 503);
  }
});

aiRoutes.post('/summarize/meeting', authorize('ai:summarize'), validate({ body: summarizeMeetingSchema }), async (req, res) => {
  try {
    const summary = await summarizationService.summarizeMeeting(req.user!.userId, req.body.meetingId);
    sendSuccess(res, { summary });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'FORBIDDEN' || msg.includes('Access')) {
      sendError(res, 'FORBIDDEN', 'Access denied', 403);
      return;
    }
    sendError(res, 'AI_ERROR', formatAiError(err), 503);
  }
});

aiRoutes.get('/search/history', authorize('ai:search'), async (req, res) => {
  const history = await searchService.searchHistory(req.user!.userId);
  sendSuccess(res, history);
});
