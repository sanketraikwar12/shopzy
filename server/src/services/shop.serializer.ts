import type { IOffer } from '../models/Shop';
import { distanceKm, roundKm } from '../utils/geo';
import { getOpenState } from '../utils/hours';

/**
 * Serializers accept hydrated documents, `.lean()` results and raw aggregation
 * rows alike, so the input is intentionally structural rather than IShop.
 */
type ShopLike = Record<string, any>;

export function activeOffers(shop: ShopLike, now = new Date()): IOffer[] {
  return (shop.offers ?? []).filter((o: IOffer) => {
    if (!o.isActive) return false;
    if (o.validFrom && new Date(o.validFrom) > now) return false;
    if (o.validUntil && new Date(o.validUntil) < now) return false;
    if (o.usageLimit && o.usageCount >= o.usageLimit) return false;
    return true;
  });
}

function priceRangeOf(shop: ShopLike) {
  if (shop.priceRange?.max) return shop.priceRange;
  const prices = (shop.pricing?.items ?? []).filter((i: any) => i.isAvailable !== false).map((i: any) => i.price);
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 };
}

export interface SerializeOptions {
  origin?: [number, number] | null;
  now?: Date;
}

/**
 * Lightweight shape for search results / cards — deliberately excludes owner
 * contact internals, documents and raw analytics.
 */
export function serializeShopCard(shop: ShopLike, opts: SerializeOptions = {}) {
  const now = opts.now ?? new Date();
  const openState = getOpenState(shop.businessHours, now);
  const offers = activeOffers(shop, now);
  const coords = shop.location?.coordinates as [number, number] | undefined;

  const distance =
    opts.origin && coords ? roundKm(shop.distanceKm ?? distanceKm(opts.origin, coords)) : undefined;

  return {
    id: String(shop._id ?? shop.id),
    slug: shop.slug,
    name: shop.basicInfo?.name,
    description: shop.basicInfo?.description,
    category: shop.basicInfo?.category,
    subCategory: shop.basicInfo?.subCategory,
    tags: shop.basicInfo?.tags ?? [],
    logo: shop.media?.logo,
    coverImage: shop.media?.coverImage,
    photoCount: shop.media?.photos?.length ?? 0,
    phone: shop.contact?.phone,
    whatsapp: shop.contact?.whatsapp,
    location: {
      coordinates: coords,
      address: shop.location?.address,
      landmark: shop.location?.landmark,
      city: shop.location?.city,
      state: shop.location?.state,
      pincode: shop.location?.pincode,
    },
    distanceKm: distance,
    ratings: {
      average: Number((shop.ratings?.average ?? 0).toFixed(1)),
      total: shop.ratings?.total ?? 0,
    },
    priceRange: priceRangeOf(shop),
    currency: shop.pricing?.currency ?? 'INR',
    itemCount: shop.pricing?.items?.length ?? 0,
    features: shop.features ?? {},
    offerCount: offers.length,
    topOffer: offers[0]
      ? { title: offers[0].title, discountType: offers[0].discountType, discountValue: offers[0].discountValue }
      : undefined,
    isOpenNow: openState.isOpenNow,
    openState,
    isVerified: shop.verification?.status === 'verified',
    isFeatured: Boolean(shop.isFeatured),
    relevanceScore: shop.score !== undefined ? Number(shop.score.toFixed?.(3) ?? shop.score) : undefined,
  };
}

/** Full detail payload for the shop page. */
export function serializeShopDetail(shop: ShopLike, opts: SerializeOptions = {}) {
  const now = opts.now ?? new Date();
  const card = serializeShopCard(shop, opts);

  return {
    ...card,
    contact: {
      phone: shop.contact?.phone,
      alternatePhone: shop.contact?.alternatePhone,
      email: shop.contact?.email,
      website: shop.contact?.website,
      whatsapp: shop.contact?.whatsapp,
    },
    media: {
      logo: shop.media?.logo,
      coverImage: shop.media?.coverImage,
      photos: (shop.media?.photos ?? []).slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
      videos: shop.media?.videos ?? [],
    },
    businessHours: shop.businessHours,
    pricing: {
      currency: shop.pricing?.currency ?? 'INR',
      items: (shop.pricing?.items ?? []).map((i: any) => ({
        id: String(i._id ?? ''),
        name: i.name,
        description: i.description,
        price: i.price,
        comparePrice: i.comparePrice,
        unit: i.unit,
        category: i.category,
        isAvailable: i.isAvailable !== false,
        image: i.image,
        variants: i.variants ?? [],
        discountPercent:
          i.comparePrice && i.comparePrice > i.price
            ? Math.round(((i.comparePrice - i.price) / i.comparePrice) * 100)
            : undefined,
      })),
    },
    offers: activeOffers(shop, now).map((o: any) => ({
      id: String(o._id ?? ''),
      title: o.title,
      description: o.description,
      discountType: o.discountType,
      discountValue: o.discountValue,
      minOrderValue: o.minOrderValue,
      maxDiscount: o.maxDiscount,
      code: o.code,
      validUntil: o.validUntil,
    })),
    ratings: {
      average: Number((shop.ratings?.average ?? 0).toFixed(1)),
      total: shop.ratings?.total ?? 0,
      breakdown: shop.ratings?.breakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
    verification: { status: shop.verification?.status ?? 'pending', verifiedAt: shop.verification?.verifiedAt },
    ownerId: String(shop.ownerId ?? ''),
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  };
}

/** Owner-facing payload — includes everything the owner is allowed to edit. */
export function serializeShopForOwner(shop: ShopLike) {
  return {
    ...serializeShopDetail(shop),
    analytics: shop.analytics,
    subscription: shop.subscription,
    verificationDetail: shop.verification,
    isActive: shop.isActive,
    allOffers: shop.offers ?? [],
  };
}
