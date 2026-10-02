import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/admin.controller';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AUDIT_ACTIONS } from '../models/AuditLog';
import { objectIdParam, paginationQuery } from '../validators/common';
import { verifyShopSchema } from '../validators/shop.validator';

const router = Router();

// Every route below requires an authenticated admin.
router.use(requireAuth, requireAdmin);

router.get('/dashboard', ctrl.dashboard);
router.get('/analytics', ctrl.platformAnalytics);
router.get('/categories', ctrl.listCategories);

router.get(
  '/shops',
  validate({
    query: paginationQuery.extend({
      status: z.enum(['pending', 'under_review', 'verified', 'rejected']).optional(),
      q: z.string().trim().max(80).optional(),
      city: z.string().trim().max(80).optional(),
    }),
  }),
  ctrl.listShops,
);

router.put('/shops/:id/verify', validate({ params: objectIdParam, body: verifyShopSchema }), ctrl.verifyShop);
router.put('/shops/:id/active', validate({ params: objectIdParam }), ctrl.toggleShopActive);
router.put('/shops/:id/featured', validate({ params: objectIdParam }), ctrl.toggleFeatured);

router.get(
  '/users',
  validate({
    query: paginationQuery.extend({
      role: z.enum(['customer', 'owner', 'admin', 'super_admin']).optional(),
      q: z.string().trim().max(80).optional(),
    }),
  }),
  ctrl.listUsers,
);

router.put(
  '/users/:id/status',
  validate({ params: objectIdParam, body: z.object({ isActive: z.boolean() }) }),
  ctrl.setUserStatus,
);

router.put(
  '/users/:id/role',
  validate({ params: objectIdParam, body: z.object({ role: z.enum(['customer', 'owner', 'admin']) }) }),
  ctrl.setUserRole,
);

router.get(
  '/reviews',
  validate({ query: paginationQuery.extend({ rating: z.coerce.number().int().min(1).max(5).optional() }) }),
  ctrl.listReviews,
);

router.put(
  '/reviews/:id/moderate',
  validate({ params: objectIdParam, body: z.object({ isActive: z.boolean() }) }),
  ctrl.moderateReview,
);

// Read-only accountability trail. Readable by any admin — hiding it from
// ordinary admins would not stop a bad actor, and visibility is the point.
router.get(
  '/audit',
  validate({
    query: paginationQuery.extend({
      action: z.enum(AUDIT_ACTIONS as [string, ...string[]]).optional(),
      actorId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    }),
  }),
  ctrl.listAuditLog,
);

export default router;
