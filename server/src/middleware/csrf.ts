import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { isProd } from '../config/env';

const CSRF_COOKIE = '_csrf';
const CSRF_HEADER = 'x-csrf-token';

/**
 * Double-submit cookie CSRF protection (OWASP).
 *
 * How it works:
 * 1. On login/register the server sets a `_csrf` cookie (non-httpOnly, so JS
 *    can read it) containing a random token.
 * 2. The SPA reads the cookie and echoes the value as an `X-CSRF-Token` header
 *    on every mutating request.
 * 3. This middleware compares cookie vs header — a cross-origin attacker can
 *    trigger the browser to *send* the cookie but cannot *read* it (same-origin
 *    policy), so they cannot forge the header.
 *
 * Safe methods (GET, HEAD, OPTIONS) are exempt: they must not cause side
 * effects anyway (RFC 7231 §4.2.1).
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Auth routes that are called *before* the user has a session. These cannot
 * have a CSRF cookie yet, so we exempt them. Every one of these either creates
 * a session (login/register) or is idempotent (forgot-password, OTP).
 */
const EXEMPT_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/otp/request',
  '/auth/otp/verify',
  '/auth/verify-phone',
  '/ai/assistant',
  '/ai/reset',
]);

function isExempt(req: Request): boolean {
  // Strip the API prefix so we compare against the logical route.
  const path = req.path.replace(/^\/api\/v1/, '');
  return EXEMPT_PATHS.has(path);
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (isExempt(req)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      error: { code: 'CSRF_INVALID', message: 'CSRF token missing or mismatched' },
    });
    return;
  }

  return next();
}

/** Sets (or refreshes) the CSRF cookie. Call alongside `setRefreshCookie`. */
export function setCsrfCookie(res: Response): void {
  const token = crypto.randomUUID();
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // JS must read this
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches refresh TTL
  });
}

/** Clears the CSRF cookie. Call alongside `clearCookie('refreshToken')`. */
export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}
