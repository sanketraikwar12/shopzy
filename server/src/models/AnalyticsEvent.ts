import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type AnalyticsEventType =
  | 'search'
  | 'impression'
  | 'shop_view'
  | 'call_click'
  | 'direction_click'
  | 'website_click'
  | 'share'
  | 'save';

export interface IAnalyticsEvent extends Document {
  eventType: AnalyticsEventType;
  userId?: Types.ObjectId;
  sessionId?: string;
  query?: string;
  filters?: Record<string, unknown>;
  shopId?: Types.ObjectId;
  shopCategory?: string;
  position?: number;
  resultCount?: number;
  device?: { type?: string; os?: string; browser?: string };
  location?: { lat?: number; lng?: number; city?: string };
  createdAt: Date;
}

/**
 * Event stream for product analytics. In the production topology this is
 * shipped to ClickHouse; here it lives in a capped-by-TTL Mongo collection so
 * the owner/admin dashboards work end to end.
 */
const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    eventType: {
      type: String,
      required: true,
      enum: ['search', 'impression', 'shop_view', 'call_click', 'direction_click', 'website_click', 'share', 'save'],
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: String,
    query: { type: String, maxlength: 200 },
    filters: Schema.Types.Mixed,
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop' },
    shopCategory: String,
    position: Number,
    resultCount: Number,
    device: { type: { type: String }, os: String, browser: String },
    location: { lat: Number, lng: Number, city: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

analyticsEventSchema.index({ shopId: 1, eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ query: 1, createdAt: -1 });
// Raw events retained for 180 days; aggregates live on the Shop document.
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export const AnalyticsEvent: Model<IAnalyticsEvent> = model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema);
