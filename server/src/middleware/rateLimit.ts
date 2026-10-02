import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { cache } from '../utils/cache';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

interface LimiterOptions {
  windowSeconds: number;
  max: number;
  bucket: string;
  /** Derive the identity being limited; defaults to IP. */
  keyFn?: (req: Request) => string;
}

/**
 * Cache-backed fixed-window rate limiter. Works against Redis in production
 * (shared across pods) and the in-process cache locally.
 *
 * A cache outage must not take the API down with it: the counter is best-effort
 * and a failure to read it lets the request through. Failing closed here would
 * turn a Redis blip into a total outage, since the general limiter sits in
 * front of every route.
 */
export function rateLimit({ windowSeconds, max, bucket, keyFn }: LimiterOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let hits: number;
    try {
      const identity = keyFn ? keyFn(req) : req.ip ?? 'unknown';
      hits = await cache.incr(`rate_limit:${bucket}:${identity}`, windowSeconds);
    } catch (err) {
      logger.error('Rate limiter unavailable, allowing request', {
        bucket,
        err: (err as Error).message,
      });
      return next();
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - hits)));

    if (hits > max) {
      res.setHeader('Retry-After', String(windowSeconds));
      return next(ApiError.tooMany());
    }

    return next();
  };
}

export const generalLimiter = rateLimit({ windowSeconds: 60, max: env.RATE_LIMIT_GENERAL, bucket: 'general' });

export const authLimiter = rateLimit({
  windowSeconds: 60,
  max: env.RATE_LIMIT_AUTH,
  bucket: 'auth',
  keyFn: (req) => `${req.ip}:${String(req.body?.email ?? req.body?.phone ?? '')}`,
});

export const searchLimiter = rateLimit({ windowSeconds: 60, max: env.RATE_LIMIT_SEARCH * 6, bucket: 'search' });

export const writeLimiter = rateLimit({ windowSeconds: 60, max: 30, bucket: 'write' });

export const otpLimiter = rateLimit({
  windowSeconds: 60,
  max: 1,
  bucket: 'otp',
  keyFn: (req) => String(req.body?.phone ?? req.ip),
});
