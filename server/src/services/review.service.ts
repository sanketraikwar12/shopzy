import mongoose from 'mongoose';
import { Review } from '../models/Review';
import { Shop } from '../models/Shop';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { invalidateShop } from './shop.service';

/**
 * Recomputes a shop's rating aggregate from its reviews.
 * Denormalising this onto the Shop keeps search sorting on a single index
 * instead of joining the reviews collection on every query.
 */
export async function recalculateRatings(shopId: string | mongoose.Types.ObjectId): Promise<void> {
  const objectId = typeof shopId === 'string' ? new mongoose.Types.ObjectId(shopId) : shopId;

  const [agg] = await Review.aggregate([
    { $match: { shopId: objectId, isActive: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        buckets: { $push: { rating: '$_id', count: '$count' } },
        total: { $sum: '$count' },
        weighted: { $sum: { $multiply: ['$_id', '$count'] } },
      },
    },
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<string, number>;
  for (const b of agg?.buckets ?? []) breakdown[String(b.rating)] = b.count;

  const total = agg?.total ?? 0;
  const average = total ? Math.round(((agg.weighted as number) / total) * 10) / 10 : 0;

  const shop = await Shop.findByIdAndUpdate(
    objectId,
    { $set: { 'ratings.average': average, 'ratings.total': total, 'ratings.breakdown': breakdown } },
    { new: true },
  ).select('slug');

  await invalidateShop(shop?.slug);
}

export async function createReview(
  shopId: string,
  userId: string,
  input: { rating: number; title?: string; comment?: string; photos?: Array<{ url: string; caption?: string }> },
) {
  const shop = await Shop.findOne({ _id: shopId, isActive: true }).select('_id ownerId').lean();
  if (!shop) throw ApiError.notFound('Shop not found');

  // Owners reviewing their own shop would poison the ranking signal.
  if (String(shop.ownerId) === userId) throw ApiError.forbidden('You cannot review your own shop');

  // A soft-deleted review still occupies the unique {shopId, userId} slot, so
  // reuse it instead of rejecting the write — otherwise deleting a review locks
  // the user out of ever reviewing that shop again.
  const existing = await Review.findOne({ shopId, userId });

  if (existing?.isActive) {
    throw ApiError.conflict('You have already reviewed this shop. Edit your existing review instead.');
  }

  let review;
  if (existing) {
    existing.set({ ...input, isActive: true, reply: undefined, helpful: { count: 0, users: [] } });
    review = await existing.save();
  } else {
    review = await Review.create({ shopId, userId, ...input });
  }

  await recalculateRatings(shopId);

  logger.info('Review created', { shopId, userId, rating: input.rating });
  return review;
}

export async function updateReview(reviewId: string, userId: string, input: { rating?: number; title?: string; comment?: string; photos?: Array<{ url: string; caption?: string }> }) {
  const review = await Review.findById(reviewId);
  if (!review || !review.isActive) throw ApiError.notFound('Review not found');
  if (String(review.userId) !== userId) throw ApiError.forbidden('You can only edit your own review');

  // Explicit field mapping — never use Object.assign with untrusted input (A01/A08).
  if (input.rating !== undefined) review.rating = input.rating;
  if (input.title !== undefined) review.title = input.title;
  if (input.comment !== undefined) review.comment = input.comment;
  if (input.photos !== undefined) review.photos = input.photos as typeof review.photos;

  await review.save();
  await recalculateRatings(review.shopId);

  return review;
}

export async function deleteReview(reviewId: string, userId: string, isAdmin: boolean) {
  const review = await Review.findById(reviewId);
  if (!review || !review.isActive) throw ApiError.notFound('Review not found');
  if (String(review.userId) !== userId && !isAdmin) throw ApiError.forbidden('You can only delete your own review');

  review.isActive = false;
  await review.save({ validateBeforeSave: false });
  await recalculateRatings(review.shopId);
}

export async function toggleHelpful(reviewId: string, userId: string): Promise<{ helpful: boolean; count: number }> {
  const review = await Review.findById(reviewId).select('+helpful.users');
  if (!review || !review.isActive) throw ApiError.notFound('Review not found');

  const objectId = new mongoose.Types.ObjectId(userId);
  const already = review.helpful.users.some((u) => String(u) === userId);

  // Read-modify-write on the array would lose votes when two taps land
  // together; $addToSet/$pull resolve on the server instead.
  const updated = await Review.findByIdAndUpdate(
    reviewId,
    already ? { $pull: { 'helpful.users': objectId } } : { $addToSet: { 'helpful.users': objectId } },
    { new: true },
  ).select('+helpful.users');

  if (!updated) throw ApiError.notFound('Review not found');

  // Keep the denormalised counter consistent with the array it summarises.
  const count = updated.helpful.users.length;
  await Review.updateOne({ _id: reviewId }, { $set: { 'helpful.count': count } });

  return { helpful: !already, count };
}

export async function replyToReview(reviewId: string, user: { id: string; role: string }, comment: string) {
  const review = await Review.findById(reviewId);
  if (!review || !review.isActive) throw ApiError.notFound('Review not found');

  const shop = await Shop.findById(review.shopId).select('ownerId').lean();
  const isOwner = shop && String(shop.ownerId) === user.id;
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  if (!isOwner && !isAdmin) throw ApiError.forbidden('Only the shop owner can reply to reviews');

  review.reply = { comment, respondedAt: new Date(), respondedBy: new mongoose.Types.ObjectId(user.id) };
  await review.save();

  return review;
}
