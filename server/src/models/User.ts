import bcrypt from 'bcryptjs';
import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { env } from '../config/env';

export type UserRole = 'customer' | 'owner' | 'admin' | 'super_admin';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  };
  location?: GeoPoint & {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  preferences: {
    searchRadius: number;
    notifications: {
      push: boolean;
      email: boolean;
      sms: boolean;
      priceDrop: boolean;
      newOffers: boolean;
    };
  };
  savedShops: Types.ObjectId[];
  searchHistory: Array<{ query: string; filters?: Record<string, unknown>; timestamp: Date }>;
  isVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  /** Set on every password change; invalidates refresh tokens issued earlier. */
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  fullName(): string;
}

const notificationSchema = new Schema(
  {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    priceDrop: { type: Boolean, default: true },
    newOffers: { type: Boolean, default: true },
  },
  { _id: false },
);

/**
 * Declared as its own schema with `default: undefined` so a user without a
 * saved location has no `location` sub-document at all. A bare `{ type: 'Point' }`
 * with no coordinates is rejected by the 2dsphere index.
 */
const userLocationSchema = new Schema(
  {
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
    address: String,
    city: String,
    state: String,
    pincode: { type: String, match: [/^\d{6}$/, 'Pincode must be 6 digits'] },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number'],
    },
    // `select: false` keeps the hash out of every query result by default.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'owner', 'admin', 'super_admin'], default: 'customer' },

    profile: {
      firstName: { type: String, trim: true, maxlength: 60 },
      lastName: { type: String, trim: true, maxlength: 60 },
      avatar: String,
      bio: { type: String, trim: true, maxlength: 180 },
      dateOfBirth: Date,
      gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    },

    location: { type: userLocationSchema, default: undefined },

    preferences: {
      searchRadius: { type: Number, default: 5, min: 1, max: 50 },
      notifications: { type: notificationSchema, default: () => ({}) },
    },

    savedShops: [{ type: Schema.Types.ObjectId, ref: 'Shop' }],

    searchHistory: {
      type: [
        {
          _id: false,
          query: String,
          filters: Schema.Types.Mixed,
          timestamp: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    isVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    passwordChangedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

// Sparse: only users who shared a location are indexed.
userSchema.index({ location: '2dsphere' }, { sparse: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, env.BCRYPT_ROUNDS);
  // Tokens carry this timestamp and are checked against it on every request,
  // so changing a password signs every existing session out.
  if (!this.isNew) this.passwordChangedAt = new Date();
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.fullName = function fullName(): string {
  return [this.profile?.firstName, this.profile?.lastName].filter(Boolean).join(' ') || this.email.split('@')[0];
};

export const User: Model<IUser> = model<IUser>('User', userSchema);
