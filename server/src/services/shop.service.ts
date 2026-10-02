import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { Shop, type IShop } from '../models/Shop';
import { AnalyticsEvent, type AnalyticsEventType } from '../models/AnalyticsEvent';
import { ApiError } from '../utils/ApiError';
import { cache } from '../utils/cache';
import { buildUniqueSlug } from '../utils/slug';
import { logger } from '../config/logger';
import { invalidateSearchCaches } from './search.service';
import type { CreateShopInput } from '../validators/shop.validator';
import type { AuthUser } from '../middleware/auth';

const DEFAULT_SCHEDULE = {
  monday: { open: '10:00', close: '21:00', isOpen: true },
  tuesday: { open: '10:00', close: '21:00', isOpen: true },
  wednesday: { open: '10:00', close: '21:00', isOpen: true },
  thursday: { open: '10:00', close: '21:00', isOpen: true },
  friday: { open: '10:00', close: '21:00', isOpen: true },
  saturday: { open: '10:00', close: '21:00', isOpen: true },
  sunday: { open: '11:00', close: '18:00', isOpen: true },
};

const shopKey = (slug: string) => `shop:${slug}`;

export async function invalidateShop(slug?: string) {
  await Promise.all([
    slug ? cache.del(shopKey(slug)) : Promise.resolve(),
    invalidateSearchCaches(),
    cache.del('categories:all'),
  ]);
}

/** Maps the flat validated input onto the nested document shape. */
function toDocument(input: Partial<CreateShopInput>) {
  const doc: Record<string, unknown> = {};

  const basicInfo: Record<string, unknown> = {};
  if (input.name !== undefined) basicInfo.name = input.name;
  if (input.description !== undefined) basicInfo.description = input.description;
  if (input.category !== undefined) basicInfo.category = input.category;
  if (input.subCategory !== undefined) basicInfo.subCategory = input.subCategory;
  if (input.tags !== undefined) basicInfo.tags = input.tags;
  if (Object.keys(basicInfo).length) doc.basicInfo = basicInfo;

  const contact: Record<string, unknown> = {};
  if (input.phone !== undefined) contact.phone = input.phone;
  if (input.alternatePhone !== undefined) contact.alternatePhone = input.alternatePhone;
  if (input.email !== undefined) contact.email = input.email;
  if (input.website !== undefined) contact.website = input.website;
  if (input.whatsapp !== undefined) contact.whatsapp = input.whatsapp;
  if (Object.keys(contact).length) doc.contact = contact;

  const location: Record<string, unknown> = {};
  if (input.lat !== undefined && input.lng !== undefined) {
    location.type = 'Point';
    location.coordinates = [input.lng, input.lat];
  }
  if (input.address !== undefined) location.address = input.address;
  if (input.landmark !== undefined) location.landmark = input.landmark;
  if (input.city !== undefined) location.city = input.city;
  if (input.state !== undefined) location.state = input.state;
  if (input.pincode !== undefined) location.pincode = input.pincode;
  if (Object.keys(location).length > 0) doc.location = location;


  if (input.businessHours) {
    // specialHours is deliberately omitted: an hours edit must not wipe holiday overrides.
    doc.businessHours = {
      timezone: input.businessHours.timezone ?? 'Asia/Kolkata',
      schedule: { ...DEFAULT_SCHEDULE, ...(input.businessHours.schedule ?? {}) },
    };
  }

  if (input.items !== undefined || input.currency !== undefined) {
    doc.pricing = { currency: input.currency ?? 'INR', items: input.items ?? [] };
  }

  if (input.offers !== undefined) doc.offers = input.offers;
  if (input.features !== undefined) doc.features = input.features;
  // Only the keys actually supplied, so setting a cover image cannot blank the logo.
  if (input.logo !== undefined || input.coverImage !== undefined) {
    const media: Record<string, unknown> = {};
    if (input.logo !== undefined) media.logo = input.logo;
    if (input.coverImage !== undefined) media.coverImage = input.coverImage;
    doc.media = media;
  }

  return doc;
}

export async function createShop(input: CreateShopInput, ownerId: string): Promise<IShop> {
  const slug = await buildUniqueSlug([input.name, input.landmark ?? input.city], async (candidate) =>
    Boolean(await Shop.exists({ slug: candidate })),
  );

  const base = toDocument(input) as Record<string, any>;

  const shop = await Shop.create({
    ...base,
    ownerId,
    slug,
    businessHours: base.businessHours ?? {
      timezone: 'Asia/Kolkata',
      schedule: DEFAULT_SCHEDULE,
      specialHours: [],
    },
    media: { ...(base.media ?? {}), photos: [], videos: [] },
    verification: { status: 'pending', documents: [] },
  });

  await Category.updateOne(
    { slug: input.category },
    { $inc: { 'stats.shopCount': 1, 'stats.activeShopCount': 1 } },
  );
  await invalidateShop();

  logger.info('Shop created', { shopId: String(shop._id), ownerId, slug });
  return shop;
}

/** Throws unless the caller owns the shop or is an admin (OWASP A01). */
export async function assertCanManage(shopId: string, user: AuthUser): Promise<IShop> {
  if (!mongoose.isValidObjectId(shopId)) throw ApiError.badRequest('Invalid shop id');

  const shop = await Shop.findById(shopId);
  if (!shop) throw ApiError.notFound('Shop not found');

  const isOwner = String(shop.ownerId) === user.id;
  const isAdminRole = user.role === 'admin' || user.role === 'super_admin';
  if (!isOwner && !isAdminRole) throw ApiError.forbidden('You can only manage your own shops');

  return shop;
}

export async function updateShop(shopId: string, input: Partial<CreateShopInput>, user: AuthUser): Promise<IShop> {
  const shop = await assertCanManage(shopId, user);
  const previousSlug = shop.slug;
  const previousCategory = shop.basicInfo.category;

  const updates = toDocument(input) as Record<string, any>;

  // Merge nested objects rather than replacing them wholesale.
  if (updates.basicInfo) Object.assign(shop.basicInfo, updates.basicInfo);
  if (updates.contact) Object.assign(shop.contact, updates.contact);
  if (updates.location) {
    Object.assign(shop.location, updates.location);
    shop.markModified('location');
  }
  if (updates.businessHours) shop.businessHours = { ...shop.businessHours, ...updates.businessHours };
  if (updates.pricing) shop.pricing = { ...shop.pricing, ...updates.pricing };
  if (updates.offers) shop.offers = updates.offers;
  if (updates.features) Object.assign(shop.features, updates.features);
  if (updates.media) Object.assign(shop.media, updates.media);

  // Renaming regenerates the slug; the old URL stops resolving by design.
  if (input.name && input.name !== shop.basicInfo.name) {
    shop.slug = await buildUniqueSlug([input.name, shop.location.landmark ?? shop.location.city], async (candidate) =>
      Boolean(await Shop.exists({ slug: candidate, _id: { $ne: shop._id } })),
    );
  }

  // A material change re-opens verification. Compare against undefined rather
  // than truthiness: latitude 0 is a valid coordinate.
  if (input.name !== undefined || input.lat !== undefined || input.category !== undefined) {
    if (shop.verification.status === 'verified') {
      shop.verification.status = 'under_review';
      shop.markModified('verification');
    }
  }

  shop.markModified('pricing.items');
  await shop.save();

  if (input.category && input.category !== previousCategory) {
    await Promise.all([
      Category.updateOne({ slug: previousCategory }, { $inc: { 'stats.shopCount': -1, 'stats.activeShopCount': -1 } }),
      Category.updateOne({ slug: input.category }, { $inc: { 'stats.shopCount': 1, 'stats.activeShopCount': 1 } }),
    ]);
  }

  await invalidateShop(previousSlug);
  await invalidateShop(shop.slug);

  return shop;
}

export async function softDeleteShop(shopId: string, user: AuthUser): Promise<IShop> {
  const shop = await assertCanManage(shopId, user);
  shop.isActive = false;
  await shop.save({ validateBeforeSave: false });

  await Category.updateOne({ slug: shop.basicInfo.category }, { $inc: { 'stats.activeShopCount': -1 } });
  await invalidateShop(shop.slug);

  logger.info('Shop soft-deleted', { shopId, by: user.id });

  // Returned so the caller can audit who was affected without re-reading.
  return shop;
}

/** Similar shops: same category, nearby, excluding the shop itself. */
export async function similarShops(shop: IShop, limit = 6) {
  return Shop.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: shop.location.coordinates },
        distanceField: 'distanceMeters',
        maxDistance: 15000,
        query: {
          _id: { $ne: shop._id },
          isActive: true,
          'verification.status': 'verified',
          'basicInfo.category': shop.basicInfo.category,
        },
        spherical: true,
        key: 'location',
      },
    },
    { $addFields: { distanceKm: { $divide: ['$distanceMeters', 1000] } } },
    { $sort: { 'ratings.average': -1, distanceKm: 1 } },
    { $limit: limit },
  ]).exec();
}

/**
 * Records an interaction: increments the aggregate counter on the shop and
 * appends a raw event for the analytics dashboards.
 */
export async function trackEvent(
  shopId: string,
  eventType: AnalyticsEventType,
  meta: { userId?: string; sessionId?: string; position?: number; category?: string } = {},
) {
  const counterField: Record<string, string> = {
    shop_view: 'analytics.views',
    call_click: 'analytics.callClicks',
    direction_click: 'analytics.directionClicks',
    website_click: 'analytics.websiteClicks',
    share: 'analytics.shareCount',
  };

  const field = counterField[eventType];

  try {
    await Promise.all([
      field ? Shop.updateOne({ _id: shopId }, { $inc: { [field]: 1 } }) : Promise.resolve(),
      AnalyticsEvent.create({
        eventType,
        shopId,
        userId: meta.userId,
        sessionId: meta.sessionId,
        position: meta.position,
        shopCategory: meta.category,
      }),
    ]);
  } catch (err) {
    logger.warn('Failed to track shop event', { err: (err as Error).message, shopId, eventType });
  }
}

export interface ShopAnalyticsSummary {
  totals: Record<string, number>;
  daily: Array<{ date: string; views: number; calls: number; directions: number }>;
  topSearchTerms: Array<{ query: string; count: number }>;
  conversionRate: number;
}

export async function shopAnalytics(shopId: string, days = 30): Promise<ShopAnalyticsSummary> {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const objectId = new mongoose.Types.ObjectId(shopId);

  // The shop's category scopes the search-term report, so it has to be read
  // before that aggregation rather than alongside it.
  const shop = await Shop.findById(shopId).select('analytics ratings basicInfo.category').lean();

  const [daily, terms] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { shopId: objectId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, type: '$eventType' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),
    // Searches within this shop's category — the previous filter pinned
    // `shopCategory` to undefined, which the driver sent as null and so only
    // ever matched category-less platform-wide searches.
    shop?.basicInfo?.category
      ? AnalyticsEvent.aggregate([
          {
            $match: {
              eventType: 'search',
              shopCategory: shop.basicInfo.category,
              createdAt: { $gte: since },
              query: { $nin: [null, ''] },
            },
          },
          { $group: { _id: '$query', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
      : Promise.resolve([]),
  ]);

  const byDate = new Map<string, { date: string; views: number; calls: number; directions: number }>();
  for (const row of daily as Array<{ _id: { date: string; type: string }; count: number }>) {
    const entry = byDate.get(row._id.date) ?? { date: row._id.date, views: 0, calls: 0, directions: 0 };
    if (row._id.type === 'shop_view') entry.views += row.count;
    if (row._id.type === 'call_click') entry.calls += row.count;
    if (row._id.type === 'direction_click') entry.directions += row.count;
    byDate.set(row._id.date, entry);
  }

  const views = shop?.analytics?.views ?? 0;
  const actions = (shop?.analytics?.callClicks ?? 0) + (shop?.analytics?.directionClicks ?? 0);

  return {
    totals: {
      views,
      uniqueViews: shop?.analytics?.uniqueViews ?? 0,
      callClicks: shop?.analytics?.callClicks ?? 0,
      directionClicks: shop?.analytics?.directionClicks ?? 0,
      websiteClicks: shop?.analytics?.websiteClicks ?? 0,
      saveCount: shop?.analytics?.saveCount ?? 0,
      shareCount: shop?.analytics?.shareCount ?? 0,
      rating: shop?.ratings?.average ?? 0,
      reviewCount: shop?.ratings?.total ?? 0,
    },
    daily: Array.from(byDate.values()),
    topSearchTerms: (terms as Array<{ _id: string; count: number }>).map((t) => ({ query: t._id, count: t.count })),
    conversionRate: views ? Math.round((actions / views) * 1000) / 10 : 0,
  };
}
