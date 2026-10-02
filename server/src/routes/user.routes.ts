import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { objectIdParam, paginationQuery } from '../validators/common';

const router = Router();

router.use(requireAuth);

router.get('/saved-shops', ctrl.listSavedShops);
router.post('/saved-shops/:id', validate({ params: objectIdParam }), ctrl.toggleSavedShop);

router.get('/reviews', validate({ query: paginationQuery }), ctrl.listMyReviews);

router.get('/search-history', ctrl.getSearchHistory);
router.delete('/search-history', ctrl.clearSearchHistory);

router.get('/export', writeLimiter, ctrl.exportMyData);

const deleteAccountBody = z.object({
  password: z.string().min(1, 'Password is required'),
});

router.delete('/account', writeLimiter, validate({ body: deleteAccountBody }), ctrl.deleteMyAccount);

export default router;
