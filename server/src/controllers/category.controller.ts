import type { Request, Response } from 'express';
import { Category } from '../models/Category';
import { Shop } from '../models/Shop';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { cache, cached, CacheTTL } from '../utils/cache';
import { buildPageMeta, created, ok } from '../utils/response';
import { recordAudit } from '../services/audit.service';
import { serializeShopCard } from '../services/shop.serializer';
import { toSlug } from '../utils/slug';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await cached('categories:all', CacheTTL.categories, async () => {
    const rows = await Category.find({ isActive: true, parentId: null }).sort({ displayOrder: 1, name: 1 }).lean();
    return rows.map((c: any) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      color: c.color,
      image: c.image,
      subCategories: c.subCategories ?? [],
      shopCount: c.stats?.activeShopCount ?? 0,
    }));
  });

  return ok(res, categories);
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!category) throw ApiError.notFound('Category not found');

  return ok(res, {
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    color: category.color,
    image: category.image,
    subCategories: category.subCategories ?? [],
    meta: category.meta,
    shopCount: category.stats?.activeShopCount ?? 0,
  });
});

export const shopsInCategory = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };

  const category = await Category.findOne({ slug: req.params.slug, isActive: true }).select('slug name').lean();
  if (!category) throw ApiError.notFound('Category not found');

  const filter = {
    'basicInfo.category': category.slug,
    isActive: true,
    'verification.status': 'verified' as const,
  };

  const [shops, total] = await Promise.all([
    Shop.find(filter)
      .sort({ isFeatured: -1, 'ratings.average': -1, 'ratings.total': -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Shop.countDocuments(filter),
  ]);

  return ok(res, shops.map((s) => serializeShopCard(s)), 200, {
    ...buildPageMeta(page, limit, total),
    category: { name: category.name, slug: category.slug },
  });
});

// --- Admin ------------------------------------------------------------------

export const create = asyncHandler(async (req: Request, res: Response) => {
  const slug = req.body.slug ? toSlug(req.body.slug) : toSlug(req.body.name);

  if (await Category.exists({ $or: [{ name: req.body.name }, { slug }] })) {
    throw ApiError.conflict('A category with this name already exists');
  }

  const category = await Category.create({
    ...req.body,
    slug,
    subCategories: (req.body.subCategories ?? []).map((s: { name: string; icon?: string }) => ({
      name: s.name,
      slug: toSlug(s.name),
      icon: s.icon,
    })),
  });

  await cache.del('categories:all');
  recordAudit(req, {
    action: 'category.create',
    targetType: 'category',
    targetId: String(category._id),
    targetLabel: category.name,
    after: { name: category.name, slug: category.slug },
  });

  return created(res, category.toJSON());
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const payload: Record<string, unknown> = { ...req.body };

  // Normalise a supplied slug: the route accepts free text, but every lookup
  // matches /^[a-z0-9-]+$/, so an un-slugified value made the row unreachable.
  if (req.body.slug !== undefined) payload.slug = toSlug(req.body.slug);

  if (req.body.subCategories) {
    payload.subCategories = req.body.subCategories.map((s: { name: string; icon?: string }) => ({
      name: s.name,
      slug: toSlug(s.name),
      icon: s.icon,
    }));
  }

  const before = await Category.findById(req.params.id).select('name slug isActive displayOrder').lean();

  const category = await Category.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true });
  if (!category) throw ApiError.notFound('Category not found');

  await cache.del('categories:all');
  recordAudit(req, {
    action: 'category.update',
    targetType: 'category',
    targetId: String(category._id),
    targetLabel: category.name,
    before: before ? { name: before.name, slug: before.slug, isActive: before.isActive } : undefined,
    after: { name: category.name, slug: category.slug, isActive: category.isActive },
  });

  return ok(res, category.toJSON());
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const inUse = await Shop.countDocuments({ 'basicInfo.category': category.slug, isActive: true });
  if (inUse > 0) throw ApiError.conflict(`${inUse} active shop(s) still use this category. Reassign them first.`);

  category.isActive = false;
  await category.save();
  await cache.del('categories:all');

  recordAudit(req, {
    action: 'category.delete',
    targetType: 'category',
    targetId: String(category._id),
    targetLabel: category.name,
    before: { isActive: true },
    after: { isActive: false },
  });

  return ok(res, { message: 'Category deactivated' });
});
