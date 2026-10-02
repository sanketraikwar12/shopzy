import { Router } from 'express';
import * as ctrl from '../controllers/shop.controller';
import * as reviewCtrl from '../controllers/review.controller';
import { optionalAuth, requireAuth, requireOwner } from '../middleware/auth';
import { searchLimiter, writeLimiter } from '../middleware/rateLimit';
import { imageUpload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { objectIdParam, slugParam } from '../validators/common';
import {
  autocompleteQuery,
  createShopSchema,
  deleteImageQuery,
  nearbyQuery,
  priceComparisonQuery,
  searchShopsQuery,
  trackEventSchema,
  updateShopSchema,
} from '../validators/shop.validator';
import { createReviewSchema, listReviewsQuery } from '../validators/review.validator';

const router = Router();

// --- Discovery (public) ------------------------------------------------------
router.get('/', searchLimiter, optionalAuth, validate({ query: searchShopsQuery }), ctrl.search);
router.get('/suggest', searchLimiter, validate({ query: autocompleteQuery }), ctrl.suggest);
router.get('/trending', ctrl.trending);
router.get('/compare', searchLimiter, validate({ query: priceComparisonQuery }), ctrl.comparePrices);
router.get('/nearby', searchLimiter, validate({ query: nearbyQuery }), ctrl.nearby);

// --- Owner-scoped listing (must precede /:slug) ------------------------------
router.get('/mine', requireAuth, requireOwner, ctrl.listMine);

// --- Shop detail (public) ----------------------------------------------------
router.get('/:slug', optionalAuth, validate({ params: slugParam }), ctrl.getBySlug);
router.get('/:slug/similar', validate({ params: slugParam }), ctrl.getSimilar);

// --- Reviews nested under a shop --------------------------------------------
// optionalAuth so the response can flag the caller's own review (`isMine`).
router.get(
  '/:id/reviews',
  optionalAuth,
  validate({ params: objectIdParam, query: listReviewsQuery }),
  reviewCtrl.listForShop,
);
router.post(
  '/:id/reviews',
  requireAuth,
  writeLimiter,
  validate({ params: objectIdParam, body: createReviewSchema }),
  reviewCtrl.create,
);

// --- Mutations ---------------------------------------------------------------
router.post('/', requireAuth, requireOwner, writeLimiter, validate({ body: createShopSchema }), ctrl.create);
router.put('/:id', requireAuth, writeLimiter, validate({ params: objectIdParam, body: updateShopSchema }), ctrl.update);
router.delete('/:id', requireAuth, validate({ params: objectIdParam }), ctrl.remove);

router.get('/:id/analytics', requireAuth, validate({ params: objectIdParam }), ctrl.analytics);
router.post('/:id/track', optionalAuth, validate({ params: objectIdParam, body: trackEventSchema }), ctrl.track);
router.post('/:id/claim', requireAuth, writeLimiter, validate({ params: objectIdParam }), ctrl.claim);

router.post(
  '/:id/images',
  requireAuth,
  writeLimiter,
  validate({ params: objectIdParam }),
  imageUpload.array('images', 10),
  ctrl.uploadImages,
);
// The photo URL travels as a query parameter, not a path segment: it contains
// slashes, and `%2F` inside a path is rejected or silently rewritten by many
// reverse proxies and CDNs.
router.delete(
  '/:id/images',
  requireAuth,
  validate({ params: objectIdParam, query: deleteImageQuery }),
  ctrl.deleteImage,
);

export default router;
