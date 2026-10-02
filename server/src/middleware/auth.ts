import type { NextFunction, Request, Response } from 'express';
import { User, type UserRole } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { isStaleAfterPasswordChange, verifyAccessToken } from '../utils/token';

export interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      id?: string;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies?.accessToken) return req.cookies.accessToken as string;
  return null;
}

/** Rejects the request unless a valid access token belonging to an active user is present. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized('Missing authentication token');

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub)
      .select('_id role email isActive passwordChangedAt')
      .lean();

    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (!user.isActive) throw ApiError.forbidden('Account has been deactivated');
    if (isStaleAfterPasswordChange(payload.pwc, user.passwordChangedAt)) {
      throw ApiError.unauthorized('Password was changed, please sign in again');
    }

    req.user = { id: String(user._id), role: user.role, email: user.email };
    next();
  } catch (err) {
    next(err);
  }
}

/** Populates req.user when a token is present but never fails the request. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub)
      .select('_id role email isActive passwordChangedAt')
      .lean();
    if (user?.isActive && !isStaleAfterPasswordChange(payload.pwc, user.passwordChangedAt)) {
      req.user = { id: String(user._id), role: user.role, email: user.email };
    }
  } catch {
    // Ignore — anonymous request.
  }
  return next();
}

/** Role-based access control (OWASP A01). */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    return next();
  };
}

export const requireAdmin = requireRole('admin', 'super_admin');
export const requireOwner = requireRole('owner', 'admin', 'super_admin');
/**
 * Reserved for actions an ordinary admin must not perform: changing roles,
 * and deactivating a category every shop in it depends on.
 */
export const requireSuperAdmin = requireRole('super_admin');

export function isAdmin(user?: AuthUser): boolean {
  return user?.role === 'admin' || user?.role === 'super_admin';
}
