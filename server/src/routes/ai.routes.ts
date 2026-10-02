import { Router } from 'express';
import * as ctrl from '../controllers/ai.controller';
import { validate } from '../middleware/validate';
import { optionalAuth } from '../middleware/auth';
import { searchLimiter } from '../middleware/rateLimit';
import { assistantChatSchema, resetConversationSchema } from '../validators/ai.validator';

const router = Router();

// Citizen AI Assistant endpoint
router.post('/assistant', searchLimiter, optionalAuth, validate({ body: assistantChatSchema }), ctrl.chat);

// Reset conversation
router.post('/reset', validate({ body: resetConversationSchema }), ctrl.reset);

// Marketplace governance insights
router.get('/insights', ctrl.insights);

export default router;
