import type { NextFunction, Request, Response } from 'express';

const FORBIDDEN_PREFIXES = ['$'];
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (FORBIDDEN_PREFIXES.some((p) => key.startsWith(p))) continue;
    // Dots in keys enable nested-path injection in Mongo update documents.
    const safeKey = key.includes('.') ? key.replace(/\./g, '_') : key;
    out[safeKey] = scrub(val, depth + 1);
  }
  return out;
}

/**
 * Strips Mongo operator keys ($gt, $where, …) and prototype-pollution keys from
 * user input. Replaces express-mongo-sanitize (which mutates req.query in a way
 * that breaks on newer Express).
 */
export function mongoSanitize(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') req.body = scrub(req.body) as typeof req.body;

  if (req.query && typeof req.query === 'object') {
    const cleaned = scrub(req.query) as Record<string, unknown>;
    Object.keys(req.query).forEach((k) => delete (req.query as Record<string, unknown>)[k]);
    Object.assign(req.query, cleaned);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = scrub(req.params) as typeof req.params;
  }

  next();
}
