import type { Request } from 'express';
import { AuditLog, type AuditAction, type AuditTargetType } from '../models/AuditLog';
import { logger } from '../config/logger';

export interface AuditInput {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
}

/**
 * Writes an audit entry for a privileged action.
 *
 * Deliberately best-effort and never awaited for correctness: a failed audit
 * write must not roll back or 500 a business action the caller was allowed to
 * perform. Failures are logged loudly instead, so a silently broken trail is
 * still visible in the logs.
 *
 * Callers pass the Request so actor identity, IP and the correlation id come
 * from one place — `requireAuth` has already populated `req.user`, and
 * `requestContext` has already set `req.id`.
 */
export function recordAudit(req: Request, input: AuditInput): void {
  const actor = req.user;
  if (!actor) {
    // Only reachable if a route forgot requireAuth; worth knowing about.
    logger.error('audit: no actor on request', { action: input.action, targetId: input.targetId });
    return;
  }

  void AuditLog.create({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    ip: req.ip,
    requestId: req.id,
    ...input,
  }).catch((err: unknown) => {
    logger.error('audit write failed', {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      actorId: actor.id,
      err: err instanceof Error ? err.message : String(err),
    });
  });
}
