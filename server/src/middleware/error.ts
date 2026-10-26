import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { isDev } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  // Truncate and sanitise the reflected URL to prevent content injection (A03).
  const safeUrl = req.originalUrl.slice(0, 120).replace(/[<>"'&]/g, '');
  next(ApiError.notFound(`Route ${req.method} ${safeUrl} not found`));
}

interface NormalisedError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

function normalise(err: unknown): NormalisedError {
  if (err instanceof ApiError) {
    return { statusCode: err.statusCode, code: err.code, message: err.message, details: err.details };
  }

  if (err instanceof ZodError) {
    return {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    };
  }

  if (err instanceof mongoose.Error.CastError) {
    return { statusCode: 400, code: 'INVALID_ID', message: `Invalid value for ${err.path}` };
  }

  const anyErr = err as { code?: number; keyValue?: Record<string, unknown>; name?: string; message?: string };

  if (anyErr?.code === 11000) {
    const field = Object.keys(anyErr.keyValue ?? {})[0] ?? 'field';
    return { statusCode: 409, code: 'DUPLICATE_KEY', message: `A record with this ${field} already exists` };
  }

  if (anyErr?.name === 'TokenExpiredError') {
    return { statusCode: 401, code: 'TOKEN_EXPIRED', message: 'Session expired, please sign in again' };
  }

  if (anyErr?.name === 'JsonWebTokenError') {
    return { statusCode: 401, code: 'INVALID_TOKEN', message: 'Invalid authentication token' };
  }

  if (anyErr?.name === 'MulterError') {
    return { statusCode: 400, code: 'UPLOAD_ERROR', message: anyErr.message ?? 'File upload failed' };
  }

  return { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong' };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const { statusCode, code, message, details } = normalise(err);

  const logPayload = {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    code,
    requestId: (req as Request & { id?: string }).id,
    userId: (req as Request & { user?: { id: string } }).user?.id,
  };

  if (statusCode >= 500) {
    logger.error(message, { ...logPayload, stack: (err as Error)?.stack });
  } else {
    logger.warn(message, { ...logPayload, ...(details ? { details } : {}) });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      // Stack traces only in local development — not staging or production (OWASP A05).
      ...(isDev && statusCode >= 500 ? { stack: (err as Error)?.stack } : {}),
    },
  });
}
