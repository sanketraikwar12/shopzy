/** Shared API types — mirrors the server's serializers. */

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, any>;
  error?: { code: string; message: string; details?: Array<{ path: string; message: string }> };
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type UserRole = 'customer' | 'owner' | 'admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  profile: { firstName?: string; lastName?: string; avatar?: string; bio?: string };
  location?: { coordinates?: [number, number]; city?: string; address?: string };
  preferences: { searchRadius: number; notifications: Record<string, boolean> };
  savedShops: string[];
  isVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

export interface OpenState {
  isOpenNow: boolean;
  reason: 'open' | 'closed_today' | 'outside_hours' | 'on_break' | 'special_closed' | 'unknown';
  opensAt?: string;
  closesAt?: string;
}

export interface ShopCard {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  tags: string[];
  logo?: string;
  coverImage?: string;
  photoCount: number;
  phone: string;
  whatsapp?: string;
  location: {
    coordinates?: [number, number];
    address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
  };
  distanceKm?: number;
  ratings: { average: number; total: number };
  priceRange: { min: number; max: number };
  currency: string;
  itemCount: number;
  features: Record<string, boolean>;
  offerCount: number;
  topOffer?: { title: string; discountType: string; discountValue: number };
  isOpenNow: boolean;
  openState: OpenState;
  isVerified: boolean;
  isFeatured: boolean;
}

export interface PriceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  unit?: string;
  category?: string;
  isAvailable: boolean;
  variants: Array<{ name: string; price: number }>;
  discountPercent?: number;
}

export interface Offer {
  id: string;
  title: string;
  description?: string;
  discountType: 'percentage' | 'fixed' | 'buy_one_get_one';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  code?: string;
  validUntil?: string;
}

export interface DaySchedule {
  open?: string;
  close?: string;
  isOpen?: boolean;
  breaks?: Array<{ start: string; end: string }>;
}

export interface ShopPhoto {
  url: string;
  caption?: string;
  order?: number;
  uploadedAt?: string;
}

export interface ShopDetail extends ShopCard {
  contact: { phone: string; alternatePhone?: string; email?: string; website?: string; whatsapp?: string };
  media: {
    logo?: string;
    coverImage?: string;
    photos: ShopPhoto[];
    videos: Array<{ url: string; thumbnail?: string }>;
  };
  businessHours: { timezone: string; schedule: Record<string, DaySchedule> };
  pricing: { currency: string; items: PriceItem[] };
  offers: Offer[];
  ratings: { average: number; total: number; breakdown: Record<string, number> };
  verification: { status: string; verifiedAt?: string; rejectionReason?: string };
  ownerId: string;
  createdAt: string;
  /** Present only when the viewer owns the shop or is an admin. */
  analytics?: Record<string, number>;
  isActive?: boolean;
  allOffers?: Offer[];
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  photos: Array<{ url: string; caption?: string }>;
  helpfulCount: number;
  reply?: { comment: string; respondedAt: string };
  isVerifiedPurchase: boolean;
  author: { id: string; name: string; avatar?: string };
  isMine: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  subCategories: Array<{ name: string; slug: string; icon?: string }>;
  shopCount: number;
}

export interface Suggestion {
  type: 'shop' | 'item';
  label: string;
  sublabel: string;
  slug?: string;
  rating?: number;
}

export interface PriceComparisonRow {
  shop: ShopCard;
  item: { name: string; price: number; comparePrice?: number; unit?: string; description?: string };
  savingsVsMax: number;
  isCheapest: boolean;
}

export interface SearchFacets {
  categories: Array<{ value: string; count: number }>;
  priceBuckets: Array<{ label: string; min: number; max: number | null; count: number }>;
  ratings: Array<{ value: number; count: number }>;
}

export type SortKey = 'relevance' | 'distance' | 'rating' | 'price_low' | 'price_high' | 'popularity' | 'newest';

export interface SearchParams {
  q?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  category?: string;
  subCategory?: string;
  city?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  openNow?: boolean;
  hasOffers?: boolean;
  hasDelivery?: boolean;
  hasBooking?: boolean;
  hasParking?: boolean;
  acceptsUPI?: boolean;
  verifiedOnly?: boolean;
  sort?: SortKey;
  page?: number;
  limit?: number;
}

export interface ShopAnalytics {
  totals: Record<string, number>;
  daily: Array<{ date: string; views: number; calls: number; directions: number }>;
  topSearchTerms: Array<{ query: string; count: number }>;
  conversionRate: number;
}

export interface AdminDashboard {
  counts: {
    totalUsers: number;
    newUsers30: number;
    totalShops: number;
    activeShops: number;
    pendingShops: number;
    verifiedShops: number;
    totalReviews: number;
    searches7: number;
  };
  verificationRate: number;
  byCategory: Array<{ category: string; count: number; avgRating: number }>;
  signupTrend: Array<{ date: string; count: number }>;
  topShops: Array<{ slug: string; name: string; city: string; views: number; rating: number }>;
}

export interface AdminShop extends ShopCard {
  verificationStatus: 'pending' | 'under_review' | 'verified' | 'rejected';
  rejectionReason?: string;
  isActive: boolean;
  owner: { id: string; email: string; phone: string; name: string } | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  profile: { firstName?: string; lastName?: string };
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

/** A review row as returned by `/admin/reviews` — refs are populated there. */
export interface AdminReview {
  _id: string;
  rating: number;
  title?: string;
  comment?: string;
  isActive: boolean;
  createdAt: string;
  userId: { _id: string; email: string; profile?: { firstName?: string } } | null;
  shopId: { _id: string; slug: string; basicInfo: { name: string } } | null;
}

export interface PlatformAnalytics {
  events: Array<{ date: string; type: string; count: number }>;
  topQueries: Array<{ query: string; count: number }>;
  /** Searches that returned nothing — the supply backlog, in priority order. */
  zeroResultQueries: Array<{ query: string; count: number }>;
  cityBreakdown: Array<{ city: string; shops: number; views: number }>;
}

export type AuditAction =
  | 'shop.verify'
  | 'shop.active'
  | 'shop.featured'
  | 'shop.update'
  | 'shop.delete'
  | 'user.status'
  | 'user.role'
  | 'review.moderate'
  | 'category.create'
  | 'category.update'
  | 'category.delete';

export interface AuditEntry {
  id: string;
  actorEmail: string;
  actorRole: UserRole;
  action: AuditAction;
  targetType: 'shop' | 'user' | 'review' | 'category';
  targetId: string;
  targetLabel?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  createdAt: string;
}

/** Category as the admin editor sees it — includes inactive rows. */
export interface AdminCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  isActive: boolean;
  subCategories?: Array<{ name: string; slug: string; icon?: string }>;
  stats?: { activeShopCount?: number };
}

export interface CategoryInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  isActive?: boolean;
}
