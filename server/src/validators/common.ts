import { z } from 'zod';
import mongoose from 'mongoose';

export const objectId = z
  .string()
  .refine((v) => mongoose.isValidObjectId(v), { message: 'Invalid id' });

export const objectIdParam = z.object({ id: objectId });

/** Password policy from spec §6: 8+ chars, upper, lower, digit, special. */
export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const email = z.string().trim().toLowerCase().email('Please provide a valid email');

export const phone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number');

export const pincode = z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits');

/**
 * An absolute http(s) URL.
 *
 * `z.string().url()` only checks that `new URL()` parses, which accepts
 * `javascript:`, `data:` and `vbscript:` — any of those reaching an `href` in
 * the SPA is stored XSS. The scheme allow-list is the actual defence.
 */
export const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      const { protocol } = new URL(v);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Must be a valid http(s) URL');

/**
 * An image reference: either one of our own upload paths (`/static/uploads/…`)
 * or an absolute http(s) URL. Rejects `javascript:`/`data:` and any attempt to
 * traverse out of the upload directory.
 */
export const imageRef = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) =>
      (v.startsWith('/static/uploads/') && !v.includes('..')) ||
      httpUrl.safeParse(v).success,
    'Must be an uploaded image path or a valid http(s) URL',
  );

export const latitude = z.coerce.number().min(-90).max(90);
export const longitude = z.coerce.number().min(-180).max(180);

export const coordinates = z.tuple([longitude, latitude]);

export const timeString = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM 24-hour format');

/** Coerces "true"/"1" query strings to booleans. */
export const booleanish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => v === true || v === 'true' || v === '1');

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const slugParam = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Invalid slug'),
});
