import { z } from 'zod';
import { booleanish, httpUrl, imageRef, latitude, longitude, phone, pincode, timeString } from './common';

const dayScheduleSchema = z.object({
  open: timeString.optional(),
  close: timeString.optional(),
  isOpen: z.boolean().default(true),
  breaks: z.array(z.object({ start: timeString, end: timeString })).max(3).optional(),
});

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const scheduleSchema = z.object(
  Object.fromEntries(DAYS.map((d) => [d, dayScheduleSchema.optional()])) as Record<
    (typeof DAYS)[number],
    z.ZodOptional<typeof dayScheduleSchema>
  >,
);

const priceItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(),
  price: z.coerce.number().min(0).max(10_000_000),
  comparePrice: z.coerce.number().min(0).optional(),
  unit: z.string().max(30).optional(),
  category: z.string().max(80).optional(),
  isAvailable: z.boolean().default(true),
  image: imageRef.optional(),
  variants: z.array(z.object({ name: z.string().max(80), price: z.coerce.number().min(0) })).max(10).optional(),
});

const offerSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().max(500).optional(),
    discountType: z.enum(['percentage', 'fixed', 'buy_one_get_one']).default('percentage'),
    discountValue: z.coerce.number().min(0).default(0),
    minOrderValue: z.coerce.number().min(0).optional(),
    maxDiscount: z.coerce.number().min(0).optional(),
    code: z.string().trim().max(30).optional(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
    isActive: z.boolean().default(true),
    usageLimit: z.coerce.number().int().min(1).optional(),
  })
  .refine((o) => o.discountType !== 'percentage' || o.discountValue <= 100, {
    message: 'Percentage discount cannot exceed 100',
    path: ['discountValue'],
  })
  .refine((o) => !o.validFrom || !o.validUntil || o.validUntil > o.validFrom, {
    message: 'validUntil must be after validFrom',
    path: ['validUntil'],
  });

export const createShopSchema = z.object({
  name: z.string().trim().min(2, 'Shop name is too short').max(120),
  description: z.string().max(2000).optional(),
  category: z.string().trim().min(1).max(60).toLowerCase(),
  subCategory: z.string().trim().max(60).toLowerCase().optional(),
  tags: z.array(z.string().trim().toLowerCase().max(40)).max(25).default([]),

  phone,
  alternatePhone: phone.optional(),
  email: z.string().email().optional(),
  website: httpUrl.optional(),
  whatsapp: phone.optional(),

  lat: latitude,
  lng: longitude,
  address: z.string().trim().min(5).max(300),
  landmark: z.string().max(150).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode,

  logo: imageRef.optional(),
  coverImage: imageRef.optional(),

  businessHours: z
    .object({
      timezone: z.string().max(60).default('Asia/Kolkata'),
      schedule: scheduleSchema.optional(),
    })
    .optional(),

  currency: z.string().length(3).default('INR'),
  items: z.array(priceItemSchema).max(200).default([]),
  offers: z.array(offerSchema).max(20).default([]),

  features: z
    .object({
      hasDelivery: z.boolean().optional(),
      hasOnlinePayment: z.boolean().optional(),
      hasBooking: z.boolean().optional(),
      hasParking: z.boolean().optional(),
      isWheelchairAccessible: z.boolean().optional(),
      acceptsCard: z.boolean().optional(),
      acceptsCash: z.boolean().optional(),
      acceptsUPI: z.boolean().optional(),
    })
    .optional(),
});

export const updateShopSchema = createShopSchema.partial().refine(
  (v) => (v.lat === undefined) === (v.lng === undefined),
  {
    message: 'lat and lng must be provided together',
    path: ['lat'],
  },
);

export const searchShopsQuery = z
  .object({
    q: z.string().trim().max(100).optional(),
    lat: latitude.optional(),
    lng: longitude.optional(),
    radius: z.coerce.number().min(0.5).max(50).default(5),
    category: z.string().trim().toLowerCase().max(60).optional(),
    subCategory: z.string().trim().toLowerCase().max(60).optional(),
    city: z.string().trim().max(80).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    openNow: booleanish.optional(),
    hasDelivery: booleanish.optional(),
    hasBooking: booleanish.optional(),
    hasParking: booleanish.optional(),
    acceptsUPI: booleanish.optional(),
    hasOffers: booleanish.optional(),
    verifiedOnly: booleanish.optional(),
    tags: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((v) => (v === undefined ? undefined : (Array.isArray(v) ? v : v.split(',')).map((t) => t.trim()).filter(Boolean))),
    sort: z.enum(['relevance', 'distance', 'rating', 'price_low', 'price_high', 'popularity', 'newest']).default('relevance'),
    page: z.coerce.number().int().min(1).max(500).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: 'lat and lng must be provided together',
    path: ['lat'],
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.maxPrice >= v.minPrice, {
    message: 'maxPrice must be greater than or equal to minPrice',
    path: ['maxPrice'],
  });

export const autocompleteQuery = z.object({
  q: z.string().trim().min(1).max(60),
  city: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(15).default(8),
});

export const priceComparisonQuery = z
  .object({
    item: z.string().trim().min(2, 'Enter at least 2 characters').max(80),
    lat: latitude.optional(),
    lng: longitude.optional(),
    radius: z.coerce.number().min(0.5).max(50).default(10),
    city: z.string().trim().max(80).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: 'lat and lng must be provided together',
    path: ['lat'],
  });

export const nearbyQuery = z.object({
  lat: latitude,
  lng: longitude,
  radius: z.coerce.number().min(0.5).max(50).default(5),
  category: z.string().trim().toLowerCase().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const trackEventSchema = z.object({
  eventType: z.enum(['shop_view', 'call_click', 'direction_click', 'website_click', 'share']),
  sessionId: z.string().max(64).optional(),
  position: z.coerce.number().int().min(0).optional(),
});

/** DELETE /shops/:id/images?url=… — the photo URL to remove. */
export const deleteImageQuery = z.object({
  url: z.string().trim().min(1, 'An image url is required').max(500),
});

export const verifyShopSchema = z
  .object({
    status: z.enum(['pending', 'under_review', 'verified', 'rejected']),
    rejectionReason: z.string().max(500).optional(),
  })
  .refine((v) => v.status !== 'rejected' || (v.rejectionReason && v.rejectionReason.length > 3), {
    message: 'A rejection reason is required when rejecting a shop',
    path: ['rejectionReason'],
  });

export const offerInputSchema = offerSchema;
export const priceItemInputSchema = priceItemSchema;

export type CreateShopInput = z.infer<typeof createShopSchema>;
export type SearchShopsQuery = z.infer<typeof searchShopsQuery>;
