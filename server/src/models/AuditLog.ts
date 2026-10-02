import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import type { UserRole } from './User';

/**
 * Every privileged write is named here rather than free-form, so the audit tab
 * can offer a filter and a typo cannot create a silently unfindable entry.
 */
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

export type AuditTargetType = 'shop' | 'user' | 'review' | 'category';

export interface IAuditLog extends Document {
  actorId: Types.ObjectId;
  actorEmail: string;
  actorRole: UserRole;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  ip?: string;
  requestId?: string;
  createdAt: Date;
}

export const AUDIT_ACTIONS: AuditAction[] = [
  'shop.verify',
  'shop.active',
  'shop.featured',
  'shop.update',
  'shop.delete',
  'user.status',
  'user.role',
  'review.moderate',
  'category.create',
  'category.update',
  'category.delete',
];

/**
 * Accountability trail for admin actions. The actor's email and role are
 * denormalised on purpose: an audit entry has to stay readable after the
 * account is renamed, demoted or deleted, which a populated ref would not
 * survive.
 */
const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorEmail: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, enum: AUDIT_ACTIONS },
    targetType: { type: String, required: true, enum: ['shop', 'user', 'review', 'category'] },
    targetId: { type: String, required: true },
    targetLabel: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    reason: { type: String, maxlength: 500 },
    ip: String,
    requestId: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
// Retained for a year — long enough to investigate a dispute, short enough
// that the collection does not grow without bound.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

export const AuditLog: Model<IAuditLog> = model<IAuditLog>('AuditLog', auditLogSchema);
