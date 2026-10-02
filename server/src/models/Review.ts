import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface IReview extends Document {
  _id: Types.ObjectId;
  shopId: Types.ObjectId;
  userId: Types.ObjectId;
  bookingId?: Types.ObjectId;
  rating: number;
  title?: string;
  comment?: string;
  photos: Array<{ url: string; caption?: string }>;
  helpful: { count: number; users: Types.ObjectId[] };
  reply?: { comment: string; respondedAt: Date; respondedBy: Types.ObjectId };
  isVerifiedPurchase: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId },

    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, maxlength: 140, trim: true },
    comment: { type: String, maxlength: 2000, trim: true },

    photos: {
      type: [{ _id: false, url: { type: String, required: true }, caption: String }],
      default: [],
      validate: [(v: unknown[]) => v.length <= 6, 'At most 6 photos per review'],
    },

    helpful: {
      count: { type: Number, default: 0 },
      users: { type: [Schema.Types.ObjectId], default: [], select: false },
    },

    reply: {
      comment: { type: String, maxlength: 1000 },
      respondedAt: Date,
      respondedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    isVerifiedPurchase: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
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

// One review per user per shop — enforced at the database level.
reviewSchema.index({ shopId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ shopId: 1, createdAt: -1 });
reviewSchema.index({ shopId: 1, rating: 1 });
reviewSchema.index({ userId: 1, createdAt: -1 });

export const Review: Model<IReview> = model<IReview>('Review', reviewSchema);
