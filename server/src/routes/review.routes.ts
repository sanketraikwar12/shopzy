import { Router } from 'express';
import * as ctrl from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { objectIdParam } from '../validators/common';
import { replyReviewSchema, updateReviewSchema } from '../validators/review.validator';

const router = Router();

router.put('/:id', requireAuth, validate({ params: objectIdParam, body: updateReviewSchema }), ctrl.update);
router.delete('/:id', requireAuth, validate({ params: objectIdParam }), ctrl.remove);
router.post('/:id/helpful', requireAuth, writeLimiter, validate({ params: objectIdParam }), ctrl.markHelpful);
router.post('/:id/reply', requireAuth, validate({ params: objectIdParam, body: replyReviewSchema }), ctrl.reply);

export default router;
