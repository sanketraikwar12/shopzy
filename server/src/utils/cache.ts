import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Cache abstraction used across the API.
 *
 * Uses Redis when REDIS_URL is configured (production topology from the spec),
 * otherwise falls back to a bounded in-process store so the app is fully
 * functional on a single machine — same interface either way.
 *
 * Key patterns (see docs/architecture.md):
 *   shop:{slug}                  1h
 *   shops:search:{hash}          5m
 *   shops:nearby:{lat}:{lng}:{r} 2m
 *   categories:all               1h
 *   user:{id}:saved              15m
 *   otp:{phone}                  5m
 *   refresh:blacklist:{jti}      7d
 */
export interface CacheDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPrefix(prefix: string): Promise<void>;
  incr(key: string, ttlSeconds: number): Promise<number>;
  close(): Promise<void>;
}

class MemoryCache implements CacheDriver {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  private readonly maxEntries = 5000;

  private sweep() {
    const now = Date.now();
    for (const [k, v] of this.store) if (v.expiresAt <= now) this.store.delete(k);
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return hit.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    if (this.store.size % 200 === 0) this.sweep();
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    const existing = this.store.get(key);
    const expiresAt = existing && existing.expiresAt > Date.now() ? existing.expiresAt : Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value: next, expiresAt });
    return next;
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}

class RedisCache implements CacheDriver {
  constructor(private client: any) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    // SCAN avoids blocking the server the way KEYS would.
    let cursor = '0';
    do {
      const [next, keys] = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
      cursor = next;
      if (keys.length) await this.client.del(...keys);
    } while (cursor !== '0');
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const value = await this.client.incr(key);
    if (value === 1) await this.client.expire(key, ttlSeconds);
    return value;
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

function createCache(): CacheDriver {
  if (!env.REDIS_URL) {
    logger.info('Cache driver: in-process memory (set REDIS_URL to use Redis)');
    return new MemoryCache();
  }
  try {
    const Redis = require('ioredis');
    const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: false });
    client.on('error', (err: Error) => logger.error('Redis error', { err: err.message }));
    logger.info('Cache driver: redis');
    return new RedisCache(client);
  } catch (err) {
    logger.warn('ioredis unavailable, falling back to memory cache', { err: (err as Error).message });
    return new MemoryCache();
  }
}

export const cache: CacheDriver = createCache();

/** Stable hash for cache keys built from query objects. */
export function hashKey(input: unknown): string {
  return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}

/** Read-through helper: return cached value or compute, store and return it. */
export async function cached<T>(key: string, ttlSeconds: number, producer: () => Promise<T>): Promise<T> {
  const hit = await cache.get<T>(key);
  if (hit !== null) return hit;
  const value = await producer();
  await cache.set(key, value, ttlSeconds);
  return value;
}

export const CacheTTL = {
  shop: 3600,
  search: 300,
  nearby: 120,
  categories: 3600,
  savedShops: 900,
  popularSearches: 600,
} as const;
