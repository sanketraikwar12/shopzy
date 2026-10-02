import crypto from 'crypto';
import { env, isProd } from '../config/env';
import { logger } from '../config/logger';
import { cache } from './cache';
import { ApiError } from './ApiError';

interface OtpRecord {
  hash: string;
  attempts: number;
  createdAt: number;
}

const key = (purpose: string, identity: string) => `otp:${purpose}:${identity}`;

function hashCode(code: string, identity: string): string {
  return crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(`${identity}:${code}`).digest('hex');
}

function generateCode(): string {
  // 6 digits, cryptographically random.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Issues an OTP with a 5 minute TTL and at most 3 verification attempts.
 * Only the HMAC of the code is stored. In non-production the code is returned
 * so the flow is demonstrable without an SMS provider.
 */
export async function issueOtp(purpose: string, identity: string): Promise<{ devCode?: string; expiresIn: number }> {
  const code = generateCode();
  const record: OtpRecord = { hash: hashCode(code, identity), attempts: 0, createdAt: Date.now() };
  await cache.set(key(purpose, identity), record, env.OTP_TTL_SECONDS);

  // Replace with Twilio / MSG91 dispatch in production.
  logger.info('OTP issued', { purpose, identity: identity.replace(/\d(?=\d{4})/g, '*') });
  if (!isProd) logger.warn(`DEV OTP for ${identity}: ${code}`);

  return { expiresIn: env.OTP_TTL_SECONDS, ...(isProd ? {} : { devCode: code }) };
}

export async function verifyOtp(purpose: string, identity: string, code: string): Promise<void> {
  const cacheKey = key(purpose, identity);
  const record = await cache.get<OtpRecord>(cacheKey);
  if (!record) throw ApiError.badRequest('OTP expired or was never requested. Please request a new code.');

  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    await cache.del(cacheKey);
    throw ApiError.tooMany('Too many incorrect attempts. Please request a new code.');
  }

  const expected = Buffer.from(record.hash);
  const actual = Buffer.from(hashCode(code, identity));
  const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!matches) {
    const remainingTtl = Math.max(
      1,
      env.OTP_TTL_SECONDS - Math.floor((Date.now() - record.createdAt) / 1000),
    );
    await cache.set(cacheKey, { ...record, attempts: record.attempts + 1 }, remainingTtl);
    throw ApiError.badRequest('Incorrect OTP');
  }

  await cache.del(cacheKey);
}
