import { z } from 'zod';
import { imageRef, paginationQuery } from './common';

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be between 1 and 5').max(5),
  title: z.string().trim().max(140).optional(),
  comment: z.string().trim().max(2000).optional(),
  photos: z.array(z.object({ url: imageRef, caption: z.string().max(140).optional() })).max(6).optional(),
});

export const updateReviewSchema = createReviewSchema.partial().strict();

export const listReviewsQuery = paginationQuery.extend({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sort: z.enum(['newest', 'oldest', 'highest', 'lowest', 'helpful']).default('newest'),
  withPhotos: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
});

export const replyReviewSchema = z.object({
  comment: z.string().trim().min(1, 'Reply cannot be empty').max(1000),
});
