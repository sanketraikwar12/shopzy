import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected';
export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'enterprise';
export type DiscountType = 'percentage' | 'fixed' | 'buy_one_get_one';

export interface IPriceItem {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  unit?: string;
  category?: string;
  isAvailable: boolean;
  image?: string;
  variants?: Array<{ name: string; price: number }>;
}

export interface IOffer {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  code?: string;
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
}

export interface IShop extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  slug: string;
  basicInfo: {
    name: string;
    description?: string;
    category: string;
    subCategory?: string;
    tags: string[];
  };
  contact: {
    phone: string;
    alternatePhone?: string;
    email?: string;
    website?: string;
    whatsapp?: string;
  };
  location: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  media: {
    logo?: string;
    coverImage?: string;
    photos: Array<{ url: string; caption?: string; order?: number; uploadedAt?: Date }>;
    videos: Array<{ url: string; thumbnail?: string; duration?: number }>;
  };
  businessHours: {
    timezone: string;
    schedule: Record<string, { open?: string; close?: string; isOpen?: boolean; breaks?: Array<{ start: string; end: string }> }>;
    specialHours: Array<{ date: Date; open?: string; close?: string; isOpen?: boolean; reason?: string }>;
  };
  pricing: {
    currency: string;
    items: IPriceItem[];
  };
  features: Record<string, boolean>;
  offers: IOffer[];
  ratings: {
    average: number;
    total: number;
    breakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
  };
  analytics: {
    views: number;
    uniqueViews: number;
    callClicks: number;
    directionClicks: number;
    websiteClicks: number;
    shareCount: number;
    saveCount: number;
  };
  verification: {
    status: VerificationStatus;
    verifiedAt?: Date;
    verifiedBy?: Types.ObjectId;
    rejectionReason?: string;
    documents: Array<{ type: string; url: string; verified?: boolean; uploadedAt?: Date }>;
  };
  subscription: {
    plan: SubscriptionPlan;
    expiresAt?: Date;
    features: string[];
  };
  priceRange?: { min: number; max: number };
  isActive: boolean;
  isFeatured: boolean;
  featuredUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const dayScheduleSchema = new Schema(
  {
    open: { type: String, match: /^\d{1,2}:\d{2}$/ },
    close: { type: String, match: /^\d{1,2}:\d{2}$/ },
    isOpen: { type: Boolean, default: true },
    breaks: {
      type: [{ _id: false, start: String, end: String }],
      default: [],
    },
  },
  { _id: false },
);

const priceItemSchema = new Schema<IPriceItem>({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, maxlength: 500 },
  price: { type: Number, required: true, min: 0, max: 10_000_000 },
  comparePrice: { type: Number, min: 0 },
  unit: { type: String, maxlength: 30 },
  category: { type: String, maxlength: 80 },
  isAvailable: { type: Boolean, default: true },
  image: String,
  variants: {
    type: [{ _id: false, name: String, price: { type: Number, min: 0 } }],
    default: [],
  },
});

const offerSchema = new Schema<IOffer>({
  title: { type: String, required: true, maxlength: 120 },
  description: { type: String, maxlength: 500 },
  discountType: { type: String, enum: ['percentage', 'fixed', 'buy_one_get_one'], default: 'percentage' },
  discountValue: { type: Number, default: 0, min: 0 },
  minOrderValue: { type: Number, min: 0 },
  maxDiscount: { type: Number, min: 0 },
  code: { type: String, uppercase: true, trim: true, maxlength: 30 },
  validFrom: Date,
  validUntil: Date,
  isActive: { type: Boolean, default: true },
  usageLimit: Number,
  usageCount: { type: Number, default: 0 },
});

const shopSchema = new Schema<IShop>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },

    basicInfo: {
      name: { type: String, required: [true, 'Shop name is required'], trim: true, maxlength: 120 },
      description: { type: String, maxlength: 2000 },
      category: { type: String, required: true, lowercase: true, trim: true },
      subCategory: { type: String, lowercase: true, trim: true },
      tags: { type: [String], default: [], validate: [(v: string[]) => v.length <= 25, 'Too many tags'] },
    },

    contact: {
      phone: { type: String, required: true, match: [/^[6-9]\d{9}$/, 'Invalid phone number'] },
      alternatePhone: { type: String, match: [/^[6-9]\d{9}$/, 'Invalid phone number'] },
      email: { type: String, lowercase: true, trim: true },
      website: String,
      whatsapp: String,
    },

    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v: number[]) =>
            Array.isArray(v) && v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
          message: 'Coordinates must be [longitude, latitude]',
        },
      },
      address: { type: String, required: true, maxlength: 300 },
      landmark: { type: String, maxlength: 150 },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, match: [/^\d{6}$/, 'Pincode must be 6 digits'] },
      country: { type: String, default: 'India' },
    },

    media: {
      logo: String,
      coverImage: String,
      photos: {
        type: [
          {
            _id: false,
            url: { type: String, required: true },
            caption: String,
            order: { type: Number, default: 0 },
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        default: [],
      },
      videos: {
        type: [{ _id: false, url: String, thumbnail: String, duration: Number }],
        default: [],
      },
    },

    businessHours: {
      timezone: { type: String, default: 'Asia/Kolkata' },
      schedule: {
        monday: { type: dayScheduleSchema, default: () => ({}) },
        tuesday: { type: dayScheduleSchema, default: () => ({}) },
        wednesday: { type: dayScheduleSchema, default: () => ({}) },
        thursday: { type: dayScheduleSchema, default: () => ({}) },
        friday: { type: dayScheduleSchema, default: () => ({}) },
        saturday: { type: dayScheduleSchema, default: () => ({}) },
        sunday: { type: dayScheduleSchema, default: () => ({}) },
      },
      specialHours: {
        type: [{ _id: false, date: Date, open: String, close: String, isOpen: Boolean, reason: String }],
        default: [],
      },
    },

    pricing: {
      currency: { type: String, default: 'INR' },
      items: { type: [priceItemSchema], default: [] },
    },

    features: {
      hasDelivery: { type: Boolean, default: false },
      hasOnlinePayment: { type: Boolean, default: false },
      hasBooking: { type: Boolean, default: false },
      hasParking: { type: Boolean, default: false },
      isWheelchairAccessible: { type: Boolean, default: false },
      acceptsCard: { type: Boolean, default: false },
      acceptsCash: { type: Boolean, default: true },
      acceptsUPI: { type: Boolean, default: false },
    },

    offers: { type: [offerSchema], default: [] },

    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      total: { type: Number, default: 0 },
      breakdown: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        5: { type: Number, default: 0 },
      },
    },

    analytics: {
      views: { type: Number, default: 0 },
      uniqueViews: { type: Number, default: 0 },
      callClicks: { type: Number, default: 0 },
      directionClicks: { type: Number, default: 0 },
      websiteClicks: { type: Number, default: 0 },
      shareCount: { type: Number, default: 0 },
      saveCount: { type: Number, default: 0 },
    },

    verification: {
      status: { type: String, enum: ['pending', 'under_review', 'verified', 'rejected'], default: 'pending' },
      verifiedAt: Date,
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      rejectionReason: { type: String, maxlength: 500 },
      documents: {
        type: [
          {
            _id: false,
            type: { type: String, enum: ['gst', 'pan', 'aadhaar', 'business_license', 'shop_photo'] },
            url: String,
            verified: { type: Boolean, default: false },
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        default: [],
      },
    },

    subscription: {
      plan: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'], default: 'free' },
      expiresAt: Date,
      features: { type: [String], default: [] },
    },

    // Denormalised for cheap range filtering and sorting without unwinding items.
    priceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },

    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    featuredUntil: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// --- Indexes (spec §4.2) -----------------------------------------------------
shopSchema.index({ location: '2dsphere' });
shopSchema.index(
  { 'basicInfo.name': 'text', 'basicInfo.description': 'text', 'basicInfo.tags': 'text', 'pricing.items.name': 'text' },
  {
    name: 'shop_text_search',
    weights: { 'basicInfo.name': 10, 'basicInfo.tags': 5, 'pricing.items.name': 4, 'basicInfo.description': 1 },
  },
);
shopSchema.index({ 'basicInfo.category': 1, 'location.city': 1, isActive: 1 });
shopSchema.index({ 'location.city': 1, 'basicInfo.category': 1, 'verification.status': 1, isActive: 1 });
shopSchema.index({ 'ratings.average': -1, 'ratings.total': -1 });
shopSchema.index({ isFeatured: -1, 'ratings.average': -1 });
shopSchema.index({ 'pricing.items.name': 1 });
shopSchema.index({ createdAt: -1 });

/** Keep priceRange in sync so search can filter/sort on a single indexed field. */
shopSchema.pre('save', function syncPriceRange(next) {
  if (this.isModified('pricing.items')) {
    const prices = (this.pricing?.items ?? []).filter((i) => i.isAvailable !== false).map((i) => i.price);
    this.priceRange = prices.length
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : { min: 0, max: 0 };
  }
  next();
});

shopSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'shopId',
});

export const Shop: Model<IShop> = model<IShop>('Shop', shopSchema);
