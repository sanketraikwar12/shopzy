import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/category.controller';
import { requireAdmin, requireAuth, requireSuperAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { imageRef, objectIdParam, paginationQuery, slugParam } from '../validators/common';

const categoryBody = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  image: imageRef.optional(),
  subCategories: z.array(z.object({ name: z.string().min(1).max(60), icon: z.string().max(40).optional() })).max(30).optional(),
  meta: z
    .object({
      title: z.string().max(120).optional(),
      description: z.string().max(300).optional(),
      keywords: z.array(z.string().max(40)).max(20).optional(),
    })
    .optional(),
  displayOrder: z.coerce.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
});

const router = Router();

router.get('/', ctrl.list);
router.get('/:slug', validate({ params: slugParam }), ctrl.getBySlug);
router.get('/:slug/shops', validate({ params: slugParam, query: paginationQuery }), ctrl.shopsInCategory);

router.post('/', requireAuth, requireAdmin, validate({ body: categoryBody }), ctrl.create);
router.put('/:id', requireAuth, requireAdmin, validate({ params: objectIdParam, body: categoryBody.partial() }), ctrl.update);
const deleteCategoryQuery = z.object({
  permanent: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

router.delete('/:id', requireAuth, requireAdmin, validate({ params: objectIdParam, query: deleteCategoryQuery }), ctrl.remove);

export default router;
