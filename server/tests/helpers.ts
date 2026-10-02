import type { Application } from 'express';
import request from 'supertest';
import { createApp } from '../src/app';
import { Category, Shop, User } from '../src/models';
import { cache } from '../src/utils/cache';

export const API = '/api/v1';

let app: Application | undefined;

export function getApp(): Application {
  if (!app) app = createApp();
  return app;
}

export async function clearCache() {
  await cache.delByPrefix('');
}

export const STRONG_PASSWORD = 'Test@1234';

let phoneCounter = 0;
let emailCounter = 0;

/** Unique credentials so parallel factory calls never collide on the unique index. */
export function uniqueEmail(prefix = 'user') {
  emailCounter += 1;
  return `${prefix}${emailCounter}@example.com`;
}

export function uniquePhone() {
  phoneCounter += 1;
  return `9${String(800000000 + phoneCounter).slice(-9)}`;
}

export async function createUser(
  overrides: Partial<{ email: string; phone: string; role: 'customer' | 'owner' | 'admin' | 'super_admin'; password: string }> = {},
) {
  const email = overrides.email ?? uniqueEmail(overrides.role ?? 'user');
  const phone = overrides.phone ?? uniquePhone();
  const password = overrides.password ?? STRONG_PASSWORD;

  const user = await User.create({
    email,
    phone,
    passwordHash: password,
    role: overrides.role ?? 'customer',
    profile: { firstName: 'Test', lastName: 'User' },
    isVerified: true,
    isPhoneVerified: true,
  });

  return { user, email, phone, password };
}

/** Registers via the API and returns a usable access token. */
export async function signIn(identifier: string, password = STRONG_PASSWORD): Promise<string> {
  const res = await request(getApp()).post(`${API}/auth/login`).send({ identifier, password });
  if (res.status !== 200) throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body.data.tokens.accessToken as string;
}

export async function createUserAndSignIn(
  role: 'customer' | 'owner' | 'admin' | 'super_admin' = 'customer',
) {
  const { user, email, password } = await createUser({ role });
  const token = await signIn(email, password);
  return { user, email, token };
}

export async function seedCategory(slug = 'salons', name = 'Salons & Spa') {
  return Category.create({ slug, name, icon: 'Scissors', color: '#ec4899', isActive: true });
}

interface ShopOptions {
  name?: string;
  slug?: string;
  category?: string;
  coordinates?: [number, number];
  items?: Array<{ name: string; price: number; isAvailable?: boolean }>;
  rating?: number;
  verification?: 'pending' | 'under_review' | 'verified' | 'rejected';
  alwaysOpen?: boolean;
}

const ALWAYS_OPEN = {
  open: '00:00',
  close: '23:59',
  isOpen: true,
};

export async function seedShop(ownerId: string, options: ShopOptions = {}) {
  const items = options.items ?? [{ name: 'Haircut (Men)', price: 250 }];
  const prices = items.filter((i) => i.isAvailable !== false).map((i) => i.price);
  const name = options.name ?? 'Test Salon';

  const schedule = Object.fromEntries(
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => [
      d,
      options.alwaysOpen === false ? { isOpen: false } : ALWAYS_OPEN,
    ]),
  );

  return Shop.create({
    ownerId,
    slug: options.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    basicInfo: {
      name,
      description: 'A test shop',
      category: options.category ?? 'salons',
      subCategory: 'unisex-salon',
      tags: ['haircut', 'grooming'],
    },
    contact: { phone: '9826000000' },
    location: {
      type: 'Point',
      coordinates: options.coordinates ?? [77.4126, 23.2599],
      address: '1 Test Road',
      landmark: 'MP Nagar',
      city: 'Bhopal',
      state: 'Madhya Pradesh',
      pincode: '462011',
      country: 'India',
    },
    media: { photos: [], videos: [] },
    businessHours: { timezone: 'Asia/Kolkata', schedule, specialHours: [] },
    pricing: { currency: 'INR', items: items.map((i) => ({ ...i, isAvailable: i.isAvailable !== false })) },
    features: { acceptsCash: true },
    offers: [],
    ratings: { average: options.rating ?? 0, total: options.rating ? 10 : 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    verification: { status: options.verification ?? 'verified', documents: [] },
    priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 },
    isActive: true,
  });
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
