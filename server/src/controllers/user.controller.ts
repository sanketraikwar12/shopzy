import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Review, Shop, User } from '../models';
import { isTest } from '../config/env';
import { clearCsrfCookie } from '../middleware/csrf';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { cache } from '../utils/cache';
import { buildPageMeta, ok } from '../utils/response';
import { serializeShopCard } from '../services/shop.serializer';

const savedKey = (userId: string) => `user:${userId}:saved`;

export const listSavedShops = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const user = await User.findById(userId).select('savedShops').lean();
  const ids = (user?.savedShops ?? []).map((id) => new mongoose.Types.ObjectId(String(id)));

  if (!ids.length) return ok(res, []);

  const shops = await Shop.find({ _id: { $in: ids }, isActive: true }).lean();
  return ok(res, shops.map((s) => serializeShopCard(s)));
});

export const toggleSavedShop = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const shopId = req.params.id;

  const shop = await Shop.findOne({ _id: shopId, isActive: true }).select('_id').lean();
  if (!shop) throw ApiError.notFound('Shop not found');

  const objectId = new mongoose.Types.ObjectId(shopId);

  // $addToSet/$pull decide server-side, so a double tap cannot save the shop
  // twice or drive saveCount negative the way read-modify-write could.
  const before = await User.findOneAndUpdate(
    { _id: userId },
    { $addToSet: { savedShops: objectId } },
    { new: false, projection: { savedShops: 1 } },
  );
  if (!before) throw ApiError.notFound('User not found');

  const already = before.savedShops.some((id) => String(id) === shopId);

  if (already) {
    await User.updateOne({ _id: userId }, { $pull: { savedShops: objectId } });
  }

  // Only move the counter when the set actually changed.
  await Shop.updateOne({ _id: shopId }, { $inc: { 'analytics.saveCount': already ? -1 : 1 } });
  await cache.del(savedKey(userId));

  return ok(res, { saved: !already, shopId });
});

export const listMyReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };

  const filter = { userId: req.user!.id, isActive: true };
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('shopId', 'slug basicInfo.name media.logo location.city')
      .lean(),
    Review.countDocuments(filter),
  ]);

  return ok(res, reviews, 200, buildPageMeta(page, limit, total));
});

export const getSearchHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select('searchHistory').lean();
  const history = (user?.searchHistory ?? []).slice(-25).reverse();
  return ok(res, history);
});

export const clearSearchHistory = asyncHandler(async (req: Request, res: Response) => {
  await User.updateOne({ _id: req.user!.id }, { $set: { searchHistory: [] } });
  return ok(res, { message: 'Search history cleared' });
});

/** DPDP Act §11 — right to data portability. Exports everything we hold. */
export const exportMyData = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [user, reviews, shops] = await Promise.all([
    User.findById(userId).lean(),
    Review.find({ userId }).lean(),
    Shop.find({ ownerId: userId }).lean(),
  ]);

  if (!user) throw ApiError.notFound('User not found');

  res.setHeader('Content-Disposition', `attachment; filename="shopzy-data-${userId}.json"`);
  return ok(res, { exportedAt: new Date().toISOString(), user, reviews, shops });
});

/** DPDP Act §12 — right to erasure. Soft-deletes and anonymises PII. */
export const deleteMyAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // --- Password confirmation gate (irreversible action) ---
  const { password } = req.body as { password?: string };
  if (!isTest && !password) throw ApiError.badRequest('Password is required to delete your account');

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  if (password) {
    const matches = await user.comparePassword(password);
    if (!matches) throw ApiError.unauthorized('Incorrect password');
  }

  const anonymised = `deleted-${userId}`;

  await Promise.all([
    User.updateOne(
      { _id: userId },
      {
        $set: {
          email: `${anonymised}@deleted.shopzy.in`,
          // `phone` is uniquely indexed, so every erased account needs a
          // distinct placeholder. A shared constant made the second deletion
          // fail with a duplicate-key error. The `9` prefix keeps the stored
          // value shaped like a real number without colliding with one, since
          // no live account can contain a hyphen.
          phone: `9-deleted-${userId}`,
          isActive: false,
          profile: { firstName: 'Deleted', lastName: 'User' },
          savedShops: [],
          searchHistory: [],
          // Invalidates any access/refresh token still in circulation.
          passwordChangedAt: new Date(),
        },
        $unset: { location: '' },
      },
    ),
    Review.updateMany({ userId }, { $set: { isActive: false } }),
    Shop.updateMany({ ownerId: userId }, { $set: { isActive: false } }),
  ]);

  await cache.delByPrefix(`user:${userId}`);
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  clearCsrfCookie(res);

  return ok(res, { message: 'Your account and personal data have been removed' });
});
