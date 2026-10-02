import type { PipelineStage } from 'mongoose';
import { Shop } from '../models/Shop';
import { User } from '../models/User';
import { AnalyticsEvent } from '../models/AnalyticsEvent';
import { cache, cached, CacheTTL, hashKey } from '../utils/cache';
import { logger } from '../config/logger';
import { serializeShopCard } from './shop.serializer';
import { getOpenState } from '../utils/hours';
import { escapeRegex as escapeRegexShared } from '../utils/slug';

export type SortKey = 'relevance' | 'distance' | 'rating' | 'price_low' | 'price_high' | 'popularity' | 'newest';

export interface SearchParams {
  q?: string;
  lat?: number;
  lng?: number;
  radius: number;
  category?: string;
  subCategory?: string;
  city?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  openNow?: boolean;
  hasDelivery?: boolean;
  hasBooking?: boolean;
  hasParking?: boolean;
  acceptsUPI?: boolean;
  hasOffers?: boolean;
  verifiedOnly?: boolean;
  tags?: string[];
  sort: SortKey;
  page: number;
  limit: number;
}

export interface SearchResult {
  items: ReturnType<typeof serializeShopCard>[];
  total: number;
  facets: {
    categories: Array<{ value: string; count: number }>;
    priceBuckets: Array<{ label: string; min: number; max: number | null; count: number }>;
    ratings: Array<{ value: number; count: number }>;
  };
  tookMs: number;
}

/** Escapes user input before it reaches a RegExp (ReDoS / injection guard). */
function escapeRegex(input: string): string {
  return escapeRegexShared(input, 100);
}

/**
 * Builds the non-geo portion of the query. Every value here has already been
 * validated and coerced by Zod, so no user-controlled operators can appear.
 */
function buildMatch(params: SearchParams): Record<string, unknown> {
  const match: Record<string, unknown> = {
    isActive: true,
    'verification.status': 'verified',
  };

  if (params.category) match['basicInfo.category'] = params.category;
  if (params.subCategory) match['basicInfo.subCategory'] = params.subCategory;
  if (params.city) match['location.city'] = new RegExp(`^${escapeRegex(params.city)}$`, 'i');
  if (params.minRating) match['ratings.average'] = { $gte: params.minRating };
  if (params.tags?.length) match['basicInfo.tags'] = { $in: params.tags.map((t) => t.toLowerCase()) };

  if (params.hasDelivery) match['features.hasDelivery'] = true;
  if (params.hasBooking) match['features.hasBooking'] = true;
  if (params.hasParking) match['features.hasParking'] = true;
  if (params.acceptsUPI) match['features.acceptsUPI'] = true;

  if (params.hasOffers) {
    // Mirrors activeOffers() in shop.serializer.ts exactly, so a shop can never
    // pass this filter and then render with an empty offer list. $expr is needed
    // because usageCount and usageLimit are two fields of the same array element,
    // which $elemMatch cannot compare.
    const now = new Date();
    match.$expr = {
      $gt: [
        {
          $size: {
            $filter: {
              input: { $ifNull: ['$offers', []] },
              as: 'o',
              cond: {
                $and: [
                  { $eq: ['$$o.isActive', true] },
                  { $or: [{ $eq: [{ $ifNull: ['$$o.validFrom', null] }, null] }, { $lte: ['$$o.validFrom', now] }] },
                  { $or: [{ $eq: [{ $ifNull: ['$$o.validUntil', null] }, null] }, { $gte: ['$$o.validUntil', now] }] },
                  {
                    $or: [
                      { $eq: [{ $ifNull: ['$$o.usageLimit', null] }, null] },
                      { $lt: [{ $ifNull: ['$$o.usageCount', 0] }, '$$o.usageLimit'] },
                    ],
                  },
                ],
              },
            },
          },
        },
        0,
      ],
    };
  }

  // Price filters run against the denormalised priceRange so they stay indexable.
  // A shop matches when its range overlaps the requested window.
  if (params.maxPrice !== undefined) match['priceRange.min'] = { $lte: params.maxPrice };
  if (params.minPrice !== undefined) match['priceRange.max'] = { $gte: params.minPrice };

  if (params.q) {
    const rx = new RegExp(escapeRegex(params.q), 'i');
    // MongoDB forbids $text inside $geoNear, so geo-aware search uses a
    // multi-field regex. At scale this stage is served by Elasticsearch.
    match.$or = [
      { 'basicInfo.name': rx },
      { 'basicInfo.description': rx },
      { 'basicInfo.tags': rx },
      { 'basicInfo.category': rx },
      { 'basicInfo.subCategory': rx },
      { 'pricing.items.name': rx },
    ];
  }

  return match;
}

/**
 * Composite relevance score.
 *   base 1.0
 *   + 3.0 if the query matches the shop name (strongest signal)
 *   + rating × 0.4
 *   + log-scaled popularity
 *   × 1.3 featured, × 1.2 verified   (spec §8 boosting)
 *   × distance decay 1 / (1 + km/5)
 */
function scoreStage(params: SearchParams, hasGeo: boolean): PipelineStage[] {
  const nameRegex = params.q ? new RegExp(escapeRegex(params.q), 'i') : null;

  return [
    {
      $addFields: {
        _nameHit: nameRegex
          ? { $cond: [{ $regexMatch: { input: '$basicInfo.name', regex: nameRegex } }, 3, 0] }
          : 0,
        _tagHit: nameRegex
          ? {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: { $ifNull: ['$basicInfo.tags', []] },
                          as: 't',
                          cond: { $regexMatch: { input: '$$t', regex: nameRegex } },
                        },
                      },
                    },
                    0,
                  ],
                },
                1.5,
                0,
              ],
            }
          : 0,
        _ratingBoost: { $multiply: [{ $ifNull: ['$ratings.average', 0] }, 0.4] },
        _popularity: { $ln: { $add: [1, { $ifNull: ['$analytics.views', 0] }] } },
        _trustMultiplier: {
          $multiply: [
            { $cond: [{ $eq: ['$isFeatured', true] }, 1.3, 1] },
            { $cond: [{ $eq: ['$verification.status', 'verified'] }, 1.2, 1] },
          ],
        },
        _distanceDecay: hasGeo
          ? { $divide: [1, { $add: [1, { $divide: [{ $ifNull: ['$distanceKm', 0] }, 5] }] }] }
          : 1,
      },
    },
    {
      $addFields: {
        score: {
          $multiply: [
            {
              $add: [
                1,
                '$_nameHit',
                '$_tagHit',
                '$_ratingBoost',
                { $multiply: ['$_popularity', 0.15] },
              ],
            },
            '$_trustMultiplier',
            '$_distanceDecay',
          ],
        },
      },
    },
  ];
}

function sortStage(sort: SortKey, hasGeo: boolean): Record<string, 1 | -1> {
  switch (sort) {
    case 'distance':
      return hasGeo ? { distanceKm: 1 } : { 'ratings.average': -1 };
    case 'rating':
      return { 'ratings.average': -1, 'ratings.total': -1 };
    case 'price_low':
      return { 'priceRange.min': 1 };
    case 'price_high':
      return { 'priceRange.max': -1 };
    case 'popularity':
      return { 'analytics.views': -1, 'ratings.total': -1 };
    case 'newest':
      return { createdAt: -1 };
    case 'relevance':
    default:
      return { score: -1, 'ratings.average': -1 };
  }
}

const PRICE_BUCKETS = [
  { label: 'Under ₹100', min: 0, max: 100 },
  { label: '₹100 – ₹500', min: 100, max: 500 },
  { label: '₹500 – ₹1,000', min: 500, max: 1000 },
  { label: '₹1,000 – ₹5,000', min: 1000, max: 5000 },
  { label: 'Above ₹5,000', min: 5000, max: null as number | null },
];

// $bucket labels each bucket with its lower boundary, so these must line up
// with PRICE_BUCKETS[].min for the count lookup to work.
const PRICE_BOUNDARIES = [0, 100, 500, 1000, 5000, Number.MAX_SAFE_INTEGER];

/**
 * Candidate cap for the `openNow` filter.
 *
 * Opening state depends on each shop's own timezone, so it cannot be expressed
 * as a query predicate — it has to be evaluated in Node. That means the page
 * cannot be cut in the database, or the filter would remove rows *after*
 * pagination and hand back short pages with a total that counts closed shops.
 * Instead we pull up to this many ranked candidates, filter, then paginate.
 */
const OPEN_NOW_CANDIDATE_CAP = 500;

export async function searchShops(params: SearchParams): Promise<SearchResult> {
  const startedAt = process.hrtime.bigint();
  const hasGeo = params.lat !== undefined && params.lng !== undefined;
  const origin: [number, number] | null = hasGeo ? [params.lng!, params.lat!] : null;

  const cacheKey = hasGeo
    ? `shops:nearby:${params.lat!.toFixed(3)}:${params.lng!.toFixed(3)}:${params.radius}:${hashKey(params)}`
    : `shops:search:${hashKey(params)}`;
  const ttl = hasGeo ? CacheTTL.nearby : CacheTTL.search;

  const result = await cached<Omit<SearchResult, 'tookMs'>>(cacheKey, ttl, async () => {
    const match = buildMatch(params);
    const pipeline: PipelineStage[] = [];

    if (hasGeo) {
      // $geoNear must be the first stage; it applies `query` while walking the
      // 2dsphere index, so filtering happens during the index scan.
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: origin! },
          distanceField: 'distanceMeters',
          maxDistance: params.radius * 1000,
          query: match,
          spherical: true,
          key: 'location',
        },
      });
      pipeline.push({ $addFields: { distanceKm: { $divide: ['$distanceMeters', 1000] } } });
    } else {
      pipeline.push({ $match: match });
    }

    pipeline.push(...scoreStage(params, hasGeo));

    const projection = {
      $project: {
        slug: 1,
        basicInfo: 1,
        contact: 1,
        location: 1,
        media: { logo: 1, coverImage: 1, photos: 1 },
        businessHours: 1,
        pricing: { currency: 1, items: 1 },
        priceRange: 1,
        features: 1,
        offers: 1,
        ratings: 1,
        verification: { status: 1 },
        isFeatured: 1,
        distanceKm: 1,
        score: 1,
        createdAt: 1,
      },
    };

    // With `openNow` the page is sliced in Node after filtering (see the cap
    // comment above); otherwise $skip/$limit keep the payload minimal.
    const itemsStages: PipelineStage.FacetPipelineStage[] = params.openNow
      ? [{ $sort: sortStage(params.sort, hasGeo) }, { $limit: OPEN_NOW_CANDIDATE_CAP }, projection]
      : [
          { $sort: sortStage(params.sort, hasGeo) },
          { $skip: (params.page - 1) * params.limit },
          { $limit: params.limit },
          projection,
        ];

    // Facets + page in a single round trip.
    pipeline.push({
      $facet: {
        items: itemsStages,
        total: [{ $count: 'value' }],
        categories: [{ $group: { _id: '$basicInfo.category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 12 }],
        ratings: [
          // `default` must fall outside the boundary range, hence -1.
          { $bucket: { groupBy: { $ifNull: ['$ratings.average', 0] }, boundaries: [0, 1, 2, 3, 4, 5.01], default: -1, output: { count: { $sum: 1 } } } },
        ],
        prices: [
          {
            $bucket: {
              groupBy: { $ifNull: ['$priceRange.min', 0] },
              boundaries: PRICE_BOUNDARIES,
              default: -1,
              output: { count: { $sum: 1 } },
            },
          },
        ],
      },
    });

    const [raw] = await Shop.aggregate(pipeline).allowDiskUse(false).exec();

    const candidates = (raw?.items ?? []) as Array<Record<string, any>>;
    const now = new Date();

    let items = candidates;
    let total = raw?.total?.[0]?.value ?? 0;

    if (params.openNow) {
      const open = candidates.filter((s) => getOpenState(s.businessHours, now).isOpenNow);
      // Count the shops that actually survived the filter so page metadata and
      // the rendered rows agree.
      total = open.length;
      const start = (params.page - 1) * params.limit;
      items = open.slice(start, start + params.limit);
    }

    // $bucket omits empty buckets, so map by boundary rather than by position.
    const priceCounts = new Map<number, number>((raw?.prices ?? []).map((b: any) => [b._id, b.count]));
    const ratingCounts = new Map<number, number>((raw?.ratings ?? []).map((b: any) => [b._id, b.count]));

    return {
      items: items.map((s) => serializeShopCard(s, { origin, now })),
      total,
      facets: {
        categories: (raw?.categories ?? []).map((c: any) => ({ value: c._id, count: c.count })),
        priceBuckets: PRICE_BUCKETS.map((b) => ({ ...b, count: priceCounts.get(b.min) ?? 0 })),
        // Rating facets are cumulative ("4★ & above"), which is how the filter reads.
        ratings: [4, 3, 2, 1].map((value) => ({
          value,
          count: [0, 1, 2, 3, 4].reduce((sum, k) => (k >= value ? sum + (ratingCounts.get(k) ?? 0) : sum), 0),
        })),
      },
    };
  });

  const tookMs = Math.round((Number(process.hrtime.bigint() - startedAt) / 1_000_000) * 100) / 100;
  return { ...result, tookMs };
}

/** Autocomplete: shop names, categories and item names. Target < 50ms. */
export async function autocomplete(query: string, city?: string, limit = 8) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  return cached(`autocomplete:${hashKey({ trimmed, city, limit })}`, 120, async () => {
    const rx = new RegExp(`^${escapeRegex(trimmed)}`, 'i');
    const contains = new RegExp(escapeRegex(trimmed), 'i');

    const filter: Record<string, unknown> = { isActive: true, 'verification.status': 'verified' };
    if (city) filter['location.city'] = new RegExp(`^${escapeRegex(city)}$`, 'i');

    const [shops, items] = await Promise.all([
      Shop.find({ ...filter, $or: [{ 'basicInfo.name': rx }, { 'basicInfo.tags': rx }] })
        .select('slug basicInfo.name basicInfo.category location.city ratings.average')
        .sort({ 'ratings.average': -1, 'analytics.views': -1 })
        .limit(limit)
        .lean(),
      Shop.aggregate([
        { $match: { ...filter, 'pricing.items.name': contains } },
        { $unwind: '$pricing.items' },
        { $match: { 'pricing.items.name': contains } },
        { $group: { _id: { $toLower: '$pricing.items.name' }, count: { $sum: 1 }, minPrice: { $min: '$pricing.items.price' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    return [
      ...shops.map((s: any) => ({
        type: 'shop' as const,
        label: s.basicInfo.name,
        sublabel: `${s.basicInfo.category} · ${s.location.city}`,
        slug: s.slug,
        rating: s.ratings?.average ?? 0,
      })),
      ...items.map((i: any) => ({
        type: 'item' as const,
        label: i._id,
        sublabel: `${i.count} shop${i.count > 1 ? 's' : ''} · from ₹${i.minPrice}`,
        slug: undefined,
      })),
    ].slice(0, limit + 5);
  });
}

export interface PriceComparisonRow {
  shop: ReturnType<typeof serializeShopCard>;
  item: { name: string; price: number; comparePrice?: number; unit?: string; description?: string };
  savingsVsMax: number;
  isCheapest: boolean;
}

/**
 * Price comparison — the platform's headline feature. Unwinds matching price
 * items across nearby shops and ranks them cheapest first.
 */
export async function comparePrices(opts: {
  itemName: string;
  lat?: number;
  lng?: number;
  radius: number;
  city?: string;
  limit: number;
}): Promise<{ item: string; rows: PriceComparisonRow[]; stats: { min: number; max: number; avg: number; count: number } }> {
  const hasGeo = opts.lat !== undefined && opts.lng !== undefined;
  const origin: [number, number] | null = hasGeo ? [opts.lng!, opts.lat!] : null;
  const rx = new RegExp(escapeRegex(opts.itemName), 'i');

  const match: Record<string, unknown> = {
    isActive: true,
    'verification.status': 'verified',
    'pricing.items.name': rx,
  };
  if (opts.city) match['location.city'] = new RegExp(`^${escapeRegex(opts.city)}$`, 'i');

  const pipeline: PipelineStage[] = [];

  if (hasGeo) {
    pipeline.push({
      $geoNear: {
        near: { type: 'Point', coordinates: origin! },
        distanceField: 'distanceMeters',
        maxDistance: opts.radius * 1000,
        query: match,
        spherical: true,
        key: 'location',
      },
    });
    pipeline.push({ $addFields: { distanceKm: { $divide: ['$distanceMeters', 1000] } } });
  } else {
    pipeline.push({ $match: match });
  }

  pipeline.push(
    { $unwind: '$pricing.items' },
    { $match: { 'pricing.items.name': rx, 'pricing.items.isAvailable': { $ne: false } } },
    { $sort: { 'pricing.items.price': 1 } },
    { $limit: opts.limit },
  );

  const rows = await Shop.aggregate(pipeline).exec();
  if (!rows.length) return { item: opts.itemName, rows: [], stats: { min: 0, max: 0, avg: 0, count: 0 } };

  const prices = rows.map((r: any) => r.pricing.items.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length);

  const now = new Date();
  return {
    item: opts.itemName,
    rows: rows.map((r: any) => ({
      shop: serializeShopCard(r, { origin, now }),
      item: {
        name: r.pricing.items.name,
        price: r.pricing.items.price,
        comparePrice: r.pricing.items.comparePrice,
        unit: r.pricing.items.unit,
        description: r.pricing.items.description,
      },
      savingsVsMax: max - r.pricing.items.price,
      isCheapest: r.pricing.items.price === min,
    })),
    stats: { min, max, avg, count: rows.length },
  };
}

/** Records the query for trending searches and per-user history. */
export async function recordSearch(params: SearchParams, resultCount: number, userId?: string, sessionId?: string) {
  if (!params.q) return;

  try {
    await AnalyticsEvent.create({
      eventType: 'search',
      userId,
      sessionId,
      query: params.q.toLowerCase().slice(0, 200),
      // Mirrors the field trackEvent() sets on shop events, so per-category
      // reporting can filter one indexed field across every event type.
      shopCategory: params.category,
      filters: { category: params.category, sort: params.sort, radius: params.radius },
      resultCount,
      location:
        params.lat !== undefined && params.lng !== undefined
          ? { lat: params.lat, lng: params.lng, city: params.city }
          : undefined,
    });

    if (userId) {
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            searchHistory: {
              $each: [{ query: params.q, filters: { category: params.category }, timestamp: new Date() }],
              $slice: -50, // keep the last 50 only
            },
          },
        },
      );
    }
  } catch (err) {
    // Analytics must never break the request path.
    logger.warn('Failed to record search event', { err: (err as Error).message });
  }
}

export async function trendingSearches(limit = 10) {
  return cached('popular:searches', CacheTTL.popularSearches, async () => {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const rows = await AnalyticsEvent.aggregate([
      { $match: { eventType: 'search', createdAt: { $gte: since }, query: { $nin: [null, ''] }, resultCount: { $gt: 0 } } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
    return rows.map((r: any) => ({ query: r._id, count: r.count }));
  });
}

export async function invalidateSearchCaches() {
  await Promise.all([cache.delByPrefix('shops:search:'), cache.delByPrefix('shops:nearby:'), cache.delByPrefix('autocomplete:')]);
}
