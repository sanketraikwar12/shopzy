import type { Request, Response } from 'express';
import { Shop } from '../models/Shop';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { buildPageMeta, created, ok } from '../utils/response';
import { publicUrl, removeStoredFile } from '../middleware/upload';
import { recordAudit } from '../services/audit.service';
import * as shopService from '../services/shop.service';
import * as searchService from '../services/search.service';
import { serializeShopCard, serializeShopDetail, serializeShopForOwner } from '../services/shop.serializer';
import type { SearchParams } from '../services/search.service';

export const search = asyncHandler(async (req: Request, res: Response) => {
  const params = req.query as unknown as SearchParams;

  const result = await searchService.searchShops(params);

  // Fire-and-forget: analytics must not add latency to the response.
  void searchService.recordSearch(params, result.total, req.user?.id, req.get('x-session-id') ?? undefined);

  return ok(res, result.items, 200, {
    ...buildPageMeta(params.page, params.limit, result.total),
    facets: result.facets,
    tookMs: result.tookMs,
  });
});

export const suggest = asyncHandler(async (req: Request, res: Response) => {
  const { q, city, limit } = req.query as unknown as { q: string; city?: string; limit: number };
  const suggestions = await searchService.autocomplete(q, city, limit);
  return ok(res, suggestions);
});

export const trending = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await searchService.trendingSearches());
});

export const comparePrices = asyncHandler(async (req: Request, res: Response) => {
  const { item, lat, lng, radius, city, limit } = req.query as unknown as {
    item: string;
    lat?: number;
    lng?: number;
    radius: number;
    city?: string;
    limit: number;
  };

  const result = await searchService.comparePrices({ itemName: item, lat, lng, radius, city, limit });
  return ok(res, result.rows, 200, { item: result.item, stats: result.stats });
});

export const nearby = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, radius, category, limit } = req.query as unknown as {
    lat: number;
    lng: number;
    radius: number;
    category?: string;
    limit: number;
  };

  const result = await searchService.searchShops({
    lat,
    lng,
    radius,
    category,
    sort: 'distance',
    page: 1,
    limit,
  } as SearchParams);

  return ok(res, result.items, 200, { total: result.total, tookMs: result.tookMs });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { lat, lng } = req.query as unknown as { lat?: number; lng?: number };
  const origin: [number, number] | null = lat !== undefined && lng !== undefined ? [lng, lat] : null;

  const shop = await Shop.findOne({ slug, isActive: true }).lean();
  if (!shop) throw ApiError.notFound('Shop not found');

  void shopService.trackEvent(String(shop._id), 'shop_view', {
    userId: req.user?.id,
    sessionId: req.get('x-session-id') ?? undefined,
    category: shop.basicInfo.category,
  });

  const isOwnerOrAdmin =
    req.user && (String(shop.ownerId) === req.user.id || req.user.role === 'admin' || req.user.role === 'super_admin');

  if (shop.verification.status !== 'verified' && !isOwnerOrAdmin) {
    throw ApiError.notFound('This shop is pending approval from Super Admin');
  }

  void shopService.trackEvent(String(shop._id), 'shop_view', {
    userId: req.user?.id,
    sessionId: req.get('x-session-id') ?? undefined,
    category: shop.basicInfo.category,
  });

  return ok(res, isOwnerOrAdmin ? serializeShopForOwner(shop) : serializeShopDetail(shop, { origin }));
});

export const getSimilar = asyncHandler(async (req: Request, res: Response) => {
  const shop = await Shop.findOne({ slug: req.params.slug, isActive: true });
  if (!shop || shop.verification.status !== 'verified') throw ApiError.notFound('Shop not found');

  const similar = await shopService.similarShops(shop);
  return ok(res, similar.map((s) => serializeShopCard(s, { origin: shop.location.coordinates })));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const shop = await shopService.createShop(req.body, req.user!.id);
  return created(res, serializeShopForOwner(shop.toObject()));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const shop = await shopService.updateShop(req.params.id, req.body, req.user!);

  // Owners editing their own shop are ordinary traffic; an admin reaching into
  // someone else's shop is what the audit trail exists for. Only the field
  // names are recorded — a full before/after of a shop document would bloat
  // every entry and could capture contact details unnecessarily.
  if (String(shop.ownerId) !== req.user!.id) {
    recordAudit(req, {
      action: 'shop.update',
      targetType: 'shop',
      targetId: String(shop._id),
      targetLabel: shop.basicInfo.name,
      after: { fields: Object.keys(req.body ?? {}) },
    });
  }

  return ok(res, serializeShopForOwner(shop.toObject()));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const shop = await shopService.softDeleteShop(req.params.id, req.user!);

  if (String(shop.ownerId) !== req.user!.id) {
    recordAudit(req, {
      action: 'shop.delete',
      targetType: 'shop',
      targetId: String(shop._id),
      targetLabel: shop.basicInfo.name,
      before: { isActive: true },
      after: { isActive: false },
    });
  }

  return ok(res, { message: 'Shop removed' });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const shops = await Shop.find({ ownerId: req.user!.id }).sort({ createdAt: -1 }).lean();
  return ok(res, shops.map((s) => serializeShopForOwner(s)));
});

export const analytics = asyncHandler(async (req: Request, res: Response) => {
  await shopService.assertCanManage(req.params.id, req.user!);
  const days = Math.min(365, Math.max(1, Number(req.query.days ?? 30)));
  return ok(res, await shopService.shopAnalytics(req.params.id, days));
});

export const track = asyncHandler(async (req: Request, res: Response) => {
  const shop = await Shop.findById(req.params.id).select('_id basicInfo.category').lean();
  if (!shop) throw ApiError.notFound('Shop not found');

  await shopService.trackEvent(req.params.id, req.body.eventType, {
    userId: req.user?.id,
    sessionId: req.body.sessionId,
    position: req.body.position,
    category: shop.basicInfo.category,
  });

  return ok(res, { tracked: true });
});

export const uploadImages = asyncHandler(async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  // Multer has already written to disk by now, so any rejection below must
  // clean up after itself or the files are orphaned.
  try {
    const shop = await shopService.assertCanManage(req.params.id, req.user!);
    if (!files.length) throw ApiError.badRequest('No images were uploaded');

    const existing = shop.media.photos.length;
    if (existing + files.length > 20) throw ApiError.badRequest('A shop can have at most 20 photos');

    const photos = files.map((f, i) => ({
      url: publicUrl(f.filename),
      caption: '',
      order: existing + i,
      uploadedAt: new Date(),
    }));

    shop.media.photos.push(...photos);
    if (!shop.media.coverImage) shop.media.coverImage = photos[0].url;
    await shop.save();
    await shopService.invalidateShop(shop.slug);

    return created(res, { photos, total: shop.media.photos.length });
  } catch (err) {
    await Promise.all(files.map((f) => removeStoredFile(publicUrl(f.filename))));
    throw err;
  }
});

export const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  const shop = await shopService.assertCanManage(req.params.id, req.user!);
  const { url } = req.query as unknown as { url: string };

  const before = shop.media.photos.length;
  shop.media.photos = shop.media.photos.filter((p) => p.url !== url);
  if (shop.media.photos.length === before) throw ApiError.notFound('Image not found on this shop');

  if (shop.media.coverImage === url) shop.media.coverImage = shop.media.photos[0]?.url;
  await shop.save();
  await shopService.invalidateShop(shop.slug);

  // Reclaim the disk space; a failure here must not fail the request.
  void removeStoredFile(url);

  return ok(res, { photos: shop.media.photos, coverImage: shop.media.coverImage });
});

export const claim = asyncHandler(async (req: Request, res: Response) => {
  const shop = await Shop.findById(req.params.id);
  if (!shop) throw ApiError.notFound('Shop not found');

  if (String(shop.ownerId) === req.user!.id) {
    throw ApiError.badRequest('You already own this listing');
  }

  // A verified listing has been through review already; letting an unrelated
  // account reopen it would let anyone strip the badge off every shop.
  if (shop.verification.status === 'verified') {
    throw ApiError.conflict(
      'This listing is already verified. Contact support if you believe you are the rightful owner.',
    );
  }

  const marker = `claim-request:${req.user!.id}`;
  if (shop.verification.documents.some((d) => d.url === marker)) {
    throw ApiError.conflict('You have already submitted a claim for this listing.');
  }

  // Bound the array so repeated claims from different accounts cannot grow the
  // document toward the 16MB BSON limit.
  const MAX_PENDING_CLAIMS = 20;
  const pendingClaims = shop.verification.documents.filter((d) => d.url.startsWith('claim-request:'));
  if (pendingClaims.length >= MAX_PENDING_CLAIMS) {
    throw ApiError.conflict('This listing already has the maximum number of pending claims under review.');
  }

  // Claims are queued for admin review rather than transferring ownership directly.
  shop.verification.status = 'under_review';
  shop.verification.documents.push({
    type: 'business_license',
    url: marker,
    verified: false,
    uploadedAt: new Date(),
  });
  shop.markModified('verification');
  await shop.save();
  await shopService.invalidateShop(shop.slug);

  logger.info('Shop claim submitted', { shopId: String(shop._id), by: req.user!.id });

  return ok(res, { message: 'Claim submitted. Our team will verify and get back to you within 48 hours.' });
});
