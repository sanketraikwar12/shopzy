import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : v === 'true' || v === '1'));

const num = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .refine((v) => !Number.isNaN(v), 'must be a number');

const str = (def: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : v));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: num(4000),
  API_PREFIX: str('/api/v1'),
  CLIENT_ORIGIN: str('http://localhost:5173'),

  MONGODB_URI: str(''),
  REDIS_URL: str(''),

  JWT_ACCESS_SECRET: str('dev-access-secret-please-change-me-32-chars'),
  JWT_REFRESH_SECRET: str('dev-refresh-secret-please-change-me-32-chars'),
  JWT_ACCESS_TTL: str('15m'),
  JWT_REFRESH_TTL: str('7d'),
  BCRYPT_ROUNDS: num(12).refine((v) => v >= 4 && v <= 15, 'BCRYPT_ROUNDS must be between 4 and 15'),

  OTP_TTL_SECONDS: num(300),
  OTP_MAX_ATTEMPTS: num(3),

  STORAGE_DRIVER: str('local'),
  UPLOAD_DIR: str('uploads'),
  MAX_UPLOAD_MB: num(5),

  RATE_LIMIT_GENERAL: num(100),
  RATE_LIMIT_AUTH: num(5),
  RATE_LIMIT_SEARCH: num(10),

  SEED_ADMIN_EMAIL: str('admin@shopzy.in'),
  SEED_ADMIN_PASSWORD: str('Admin@1234'),

  TRUST_PROXY: bool(false),

  AI_API_KEY: str(''),
  AI_MODEL: str('gemini-1.5-flash'),
  AI_BASE_URL: str(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDev = env.NODE_ENV === 'development';

if (isProd) {
  const fatal: string[] = [];

  const DEFAULTS = [
    'dev-access-secret-please-change-me-32-chars',
    'dev-refresh-secret-please-change-me-32-chars',
    'change-me-access-secret-min-32-characters-long',
    'change-me-refresh-secret-min-32-characters-long',
  ];

  // Length matters as much as novelty: a short but custom secret is brute
  // forceable, and the previous check only rejected the two literal defaults.
  const MIN_SECRET_LENGTH = 32;
  const secrets: Array<[string, string]> = [
    ['JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET],
    ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
  ];

  for (const [name, value] of secrets) {
    if (DEFAULTS.includes(value)) fatal.push(`${name} is still set to a documented default.`);
    else if (value.length < MIN_SECRET_LENGTH) {
      fatal.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters (got ${value.length}).`);
    }
  }

  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    fatal.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ, or a refresh token can be replayed as an access token.');
  }

  if (!env.MONGODB_URI) fatal.push('MONGODB_URI is required in production.');

  // Low round counts are legitimate in tests (speed) but not in production.
  if (env.BCRYPT_ROUNDS < 10) {
    fatal.push(`BCRYPT_ROUNDS must be at least 10 in production (got ${env.BCRYPT_ROUNDS}).`);
  }

  if (env.CLIENT_ORIGIN.split(',').some((o) => o.trim() === '*')) {
    fatal.push('CLIENT_ORIGIN cannot be "*" when credentials are allowed.');
  }

  if (fatal.length) {
    console.error(`FATAL: refusing to start in production:\n  - ${fatal.join('\n  - ')}`);
    process.exit(1);
  }

  // A warning, not a fatal: the API never reads this value at runtime, so it
  // must not block boot. The seed script refuses to use it instead.
  if (env.SEED_ADMIN_PASSWORD === 'Admin@1234') {
    console.warn('WARNING: SEED_ADMIN_PASSWORD is the documented default. Seeding will be refused until it is changed.');
  }
}
