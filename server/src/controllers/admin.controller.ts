import type { Request, Response } from 'express';
import { AnalyticsEvent, AuditLog, Category, Review, Shop, User } from '../models';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { buildPageMeta, ok } from '../utils/response';
import { logger } from '../config/logger';
import { recordAudit } from '../services/audit.service';
import { invalidateShop } from '../services/shop.service';
import { serializeShopCard } from '../services/shop.serializer';
import { containsRegex, exactMatchRegex } from '../utils/slug';

export const dashboard = asyncHandler(async (_req: Request, res: Response) => {
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [
    totalUsers,
    newUsers30,
    totalShops,
    activeShops,
    pendingShops,
    verifiedShops,
    totalReviews,
    searches7,
    byCategory,
    signupTrend,
    topShops,
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: true, createdAt: { $gte: since30 } }),
    Shop.countDocuments({}),
    Shop.countDocuments({ isActive: true }),
    Shop.countDocuments({ 'verification.status': { $in: ['pending', 'under_review'] }, isActive: true }),
    Shop.countDocuments({ 'verification.status': 'verified', isActive: true }),
    Review.countDocuments({ isActive: true }),
    AnalyticsEvent.countDocuments({ eventType: 'search', createdAt: { $gte: since7 } }),
    Shop.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$basicInfo.category', count: { $sum: 1 }, avgRating: { $avg: '$ratings.average' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: since30 } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Shop.find({ isActive: true })
      .sort({ 'analytics.views': -1 })
      .limit(5)
      .select('slug basicInfo.name analytics.views ratings.average location.city')
      .lean(),
  ]);

  return ok(res, {
    counts: {
      totalUsers,
      newUsers30,
      totalShops,
      activeShops,
      pendingShops,
      verifiedShops,
      totalReviews,
      searches7,
    },
    verificationRate: activeShops ? Math.round((verifiedShops / activeShops) * 1000) / 10 : 0,
    byCategory: byCategory.map((c: any) => ({
      category: c._id,
      count: c.count,
      avgRating: Math.round((c.avgRating ?? 0) * 10) / 10,
    })),
    signupTrend: signupTrend.map((s: any) => ({ date: s._id, count: s.count })),
    topShops: topShops.map((s: any) => ({
      slug: s.slug,
      name: s.basicInfo.name,
      city: s.location.city,
      views: s.analytics?.views ?? 0,
      rating: s.ratings?.average ?? 0,
    })),
  });
});

export const listShops = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, q, city } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
    q?: string;
    city?: string;
  };

  const filter: Record<string, unknown> = {};
  if (status === 'pending') filter['verification.status'] = { $in: ['pending', 'under_review'] };
  else if (status) filter['verification.status'] = status;
  if (city) filter['location.city'] = exactMatchRegex(city);
  if (q) filter['basicInfo.name'] = containsRegex(q);

  const [shops, total] = await Promise.all([
    Shop.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('ownerId', 'email phone profile.firstName profile.lastName')
      .lean(),
    Shop.countDocuments(filter),
  ]);

  const payload = shops.map((s: any) => ({
    ...serializeShopCard(s),
    verificationStatus: s.verification?.status,
    rejectionReason: s.verification?.rejectionReason,
    isActive: s.isActive,
    documents: s.verification?.documents ?? [],
    owner: s.ownerId
      ? {
          id: String(s.ownerId._id ?? s.ownerId),
          email: s.ownerId.email,
          phone: s.ownerId.phone,
          name: [s.ownerId.profile?.firstName, s.ownerId.profile?.lastName].filter(Boolean).join(' '),
        }
      : null,
    createdAt: s.createdAt,
  }));

  return ok(res, payload, 200, buildPageMeta(page, limit, total));
});

export const verifyShop = asyncHandler(async (req: Request, res: Response) => {
  const { status, rejectionReason } = req.body;

  const shop = await Shop.findById(req.params.id);
  if (!shop) throw ApiError.notFound('Shop not found');

  const previousStatus = shop.verification.status;

  shop.verification.status = status;
  shop.verification.verifiedBy = req.user!.id as never;
  shop.verification.verifiedAt = status === 'verified' ? new Date() : undefined;
  shop.verification.rejectionReason = status === 'rejected' ? rejectionReason : undefined;
  shop.markModified('verification');

  await shop.save({ validateBeforeSave: false });
  await invalidateShop(shop.slug);

  logger.info('Shop verification updated', { shopId: req.params.id, status, by: req.user!.id });
  recordAudit(req, {
    action: 'shop.verify',
    targetType: 'shop',
    targetId: String(shop._id),
    targetLabel: shop.basicInfo.name,
    before: { status: previousStatus },
    after: { status },
    reason: status === 'rejected' ? rejectionReason : undefined,
  });

  // Notification hook: emits shop:verification over the event bus in production.
  return ok(res, { id: String(shop._id), slug: shop.slug, verification: shop.verification });
});

export const toggleShopActive = asyncHandler(async (req: Request, res: Response) => {
  const shop = await Shop.findById(req.params.id);
  if (!shop) throw ApiError.notFound('Shop not found');

  const wasActive = shop.isActive;

  shop.isActive = !shop.isActive;
  await shop.save({ validateBeforeSave: false });
  await invalidateShop(shop.slug);

  await Category.updateOne(
    { slug: shop.basicInfo.category },
    { $inc: { 'stats.activeShopCount': shop.isActive ? 1 : -1 } },
  );

  recordAudit(req, {
    action: 'shop.active',
    targetType: 'shop',
    targetId: String(shop._id),
    targetLabel: shop.basicInfo.name,
    before: { isActive: wasActive },
    after: { isActive: shop.isActive },
  });

  return ok(res, { id: String(shop._id), isActive: shop.isActive });
});

export const toggleFeatured = asyncHandler(async (req: Request, res: Response) => {
  const shop = await Shop.findById(req.params.id);
  if (!shop) throw ApiError.notFound('Shop not found');

  const wasFeatured = shop.isFeatured;

  shop.isFeatured = !shop.isFeatured;
  shop.featuredUntil = shop.isFeatured ? new Date(Date.now() + 30 * 24 * 3600 * 1000) : undefined;
  await shop.save({ validateBeforeSave: false });
  await invalidateShop(shop.slug);

  recordAudit(req, {
    action: 'shop.featured',
    targetType: 'shop',
    targetId: String(shop._id),
    targetLabel: shop.basicInfo.name,
    before: { isFeatured: wasFeatured },
    after: { isFeatured: shop.isFeatured, featuredUntil: shop.featuredUntil },
  });

  return ok(res, { id: String(shop._id), isFeatured: shop.isFeatured, featuredUntil: shop.featuredUntil });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, role, q } = req.query as unknown as { page: number; limit: number; role?: string; q?: string };

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (q) {
    const rx = containsRegex(q);
    filter.$or = [{ email: rx }, { phone: rx }, { 'profile.firstName': rx }, { 'profile.lastName': rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('email phone role profile isVerified isActive lastLoginAt createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return ok(res, users.map((u: any) => ({ ...u, id: String(u._id), _id: undefined })), 200, buildPageMeta(page, limit, total));
});

export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  if (req.params.id === req.user!.id) throw ApiError.badRequest('You cannot change your own account status');

  const target = await User.findById(req.params.id).select('role isActive email');
  if (!target) throw ApiError.notFound('User not found');

  // Only a super_admin may act on another admin.
  if ((target.role === 'admin' || target.role === 'super_admin') && req.user!.role !== 'super_admin') {
    throw ApiError.forbidden('Only a super admin can modify administrator accounts');
  }

  const wasActive = target.isActive;

  target.isActive = Boolean(req.body.isActive);
  await target.save({ validateBeforeSave: false });

  logger.warn('User status changed', { userId: req.params.id, isActive: target.isActive, by: req.user!.id });
  recordAudit(req, {
    action: 'user.status',
    targetType: 'user',
    targetId: req.params.id,
    targetLabel: target.email,
    before: { isActive: wasActive },
    after: { isActive: target.isActive },
  });

  return ok(res, { id: String(target._id), isActive: target.isActive });
});

export const setUserRole = asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'super_admin') throw ApiError.forbidden('Only a super admin can change roles');
  if (req.params.id === req.user!.id) throw ApiError.badRequest('You cannot change your own role');

  const before = await User.findById(req.params.id).select('role email').lean();
  if (!before) throw ApiError.notFound('User not found');

  const user = await User.findByIdAndUpdate(req.params.id, { $set: { role: req.body.role } }, { new: true }).select('role');
  if (!user) throw ApiError.notFound('User not found');

  logger.warn('User role changed', { userId: req.params.id, role: req.body.role, by: req.user!.id });
  recordAudit(req, {
    action: 'user.role',
    targetType: 'user',
    targetId: req.params.id,
    targetLabel: before.email,
    before: { role: before.role },
    after: { role: user.role },
  });

  return ok(res, { id: String(user._id), role: user.role });
});

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, rating } = req.query as unknown as { page: number; limit: number; rating?: number };

  const filter: Record<string, unknown> = { isActive: true };
  if (rating) filter.rating = rating;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'email profile.firstName')
      .populate('shopId', 'slug basicInfo.name')
      .lean(),
    Review.countDocuments(filter),
  ]);

  return ok(res, reviews, 200, buildPageMeta(page, limit, total));
});

export const moderateReview = asyncHandler(async (req: Request, res: Response) => {
  // Returns the pre-update document, so the audit entry records what the value
  // actually was rather than assuming the flag flipped.
  const previous = await Review.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: Boolean(req.body.isActive) } },
    { new: false },
  );
  if (!previous) throw ApiError.notFound('Review not found');

  // Ratings must be recomputed after moderation.
  const { recalculateRatings } = await import('../services/review.service');
  await recalculateRatings(previous.shopId);

  const isActive = Boolean(req.body.isActive);

  recordAudit(req, {
    action: 'review.moderate',
    targetType: 'review',
    targetId: String(previous._id),
    targetLabel: previous.title || `${previous.rating}★ review`,
    before: { isActive: previous.isActive },
    after: { isActive },
  });

  return ok(res, { id: String(previous._id), isActive });
});

export const listAuditLog = asyncHandler(async (req: Request, res: Response) => {  const { page, limit, action, actorId } = req.query as unknown as {
    page: number;
    limit: number;
    action?: string;
    actorId?: string;
  };

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (actorId) filter.actorId = actorId;

  const [entries, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return ok(
    res,
    entries.map((e) => ({
      id: String(e._id),
      actorEmail: e.actorEmail,
      actorRole: e.actorRole,
      action: e.action,
      targetType: e.targetType,
      targetId: e.targetId,
      targetLabel: e.targetLabel,
      before: e.before,
      after: e.after,
      reason: e.reason,
      createdAt: e.createdAt,
    })),
    200,
    buildPageMeta(page, limit, total),
  );
});

export const platformAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days ?? 30)));
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);

  const [events, topQueries, zeroResult, cityBreakdown] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, type: '$eventType' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { eventType: 'search', createdAt: { $gte: since }, resultCount: { $gt: 0 } } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { eventType: 'search', createdAt: { $gte: since }, resultCount: 0 } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    Shop.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$location.city', shops: { $sum: 1 }, views: { $sum: '$analytics.views' } } },
      { $sort: { shops: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return ok(res, {
    events: events.map((e: any) => ({ date: e._id.date, type: e._id.type, count: e.count })),
    topQueries: topQueries.map((q: any) => ({ query: q._id, count: q.count })),
    zeroResultQueries: zeroResult.map((q: any) => ({ query: q._id, count: q.count })),
    cityBreakdown: cityBreakdown.map((c: any) => ({ city: c._id, shops: c.shops, views: c.views })),
  });
});

/**
 * Categories for the admin editor. Unlike the public `GET /categories` this
 * includes deactivated rows — otherwise a category, once deleted, could never
 * be found again to restore. Uncached on purpose so an edit shows immediately;
 * the public list keeps its `categories:all` cache.
 */
export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find({}).sort({ displayOrder: 1, name: 1 }).lean();
  return ok(res, categories);
});
