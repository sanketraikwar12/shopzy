import type { Request, Response } from 'express';
import { Review } from '../models/Review';
import { asyncHandler } from '../utils/asyncHandler';
import { buildPageMeta, created, ok } from '../utils/response';
import { isAdmin } from '../middleware/auth';
import * as reviewService from '../services/review.service';

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
  helpful: { 'helpful.count': -1, createdAt: -1 },
};

export const listForShop = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, rating, sort, withPhotos } = req.query as unknown as {
    page: number;
    limit: number;
    rating?: number;
    sort: string;
    withPhotos?: boolean;
  };

  const filter: Record<string, unknown> = { shopId: req.params.id, isActive: true };
  if (rating) filter.rating = rating;
  if (withPhotos) filter['photos.0'] = { $exists: true };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort(SORTS[sort] ?? SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'profile.firstName profile.lastName profile.avatar')
      .lean(),
    Review.countDocuments(filter),
  ]);

  const payload = reviews.map((r: any) => ({
    id: String(r._id),
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    photos: r.photos ?? [],
    helpfulCount: r.helpful?.count ?? 0,
    reply: r.reply?.comment ? { comment: r.reply.comment, respondedAt: r.reply.respondedAt } : undefined,
    isVerifiedPurchase: r.isVerifiedPurchase,
    author: {
      id: String(r.userId?._id ?? r.userId),
      name: [r.userId?.profile?.firstName, r.userId?.profile?.lastName].filter(Boolean).join(' ') || 'Shopzy user',
      avatar: r.userId?.profile?.avatar,
    },
    isMine: req.user ? String(r.userId?._id ?? r.userId) === req.user.id : false,
    createdAt: r.createdAt,
  }));

  return ok(res, payload, 200, buildPageMeta(page, limit, total));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.createReview(req.params.id, req.user!.id, req.body);
  return created(res, review.toJSON());
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.updateReview(req.params.id, req.user!.id, req.body);
  return ok(res, review.toJSON());
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await reviewService.deleteReview(req.params.id, req.user!.id, isAdmin(req.user));
  return ok(res, { message: 'Review removed' });
});

export const markHelpful = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.toggleHelpful(req.params.id, req.user!.id);
  return ok(res, result);
});

export const reply = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.replyToReview(req.params.id, req.user!, req.body.comment);
  return ok(res, review.toJSON());
});
