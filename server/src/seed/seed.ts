import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AnalyticsEvent, Category, Review, Shop, User } from '../models';
import { recalculateRatings } from '../services/review.service';
import { toSlug } from '../utils/slug';
import { CATEGORIES, CUSTOMER_NAMES, REVIEW_TEMPLATES, SHOPS } from './data';

const DEMO_PASSWORD = 'Password@123';

async function wipe() {
  await Promise.all([
    User.deleteMany({}),
    Shop.deleteMany({}),
    Review.deleteMany({}),
    Category.deleteMany({}),
    AnalyticsEvent.deleteMany({}),
  ]);
  console.log('  ✓ Cleared existing collections');
}

async function seedCategories() {
  const docs = await Category.insertMany(
    CATEGORIES.map((c) => ({
      ...c,
      subCategories: c.subCategories.map((s) => ({ ...s, slug: s.slug || toSlug(s.name) })),
      isActive: true,
    })),
  );
  console.log(`  ✓ ${docs.length} categories`);
  return docs;
}

async function seedUsers() {
  const admin = await User.create({
    email: env.SEED_ADMIN_EMAIL,
    phone: '9999900001',
    passwordHash: env.SEED_ADMIN_PASSWORD,
    role: 'super_admin',
    profile: { firstName: 'Shopzy', lastName: 'Admin' },
    isVerified: true,
    isPhoneVerified: true,
  });

  const owners = await User.create(
    SHOPS.map((shop, i) => ({
      email: `owner${i + 1}@shopzy.in`,
      phone: `98888${String(10000 + i).slice(-5)}`,
      passwordHash: DEMO_PASSWORD,
      role: 'owner' as const,
      profile: { firstName: shop.name.split(' ')[0], lastName: 'Owner' },
      isVerified: true,
      isPhoneVerified: true,
      location: {
        type: 'Point' as const,
        coordinates: shop.coordinates,
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        pincode: shop.pincode,
      },
    })),
  );

  const customers = await User.create(
    CUSTOMER_NAMES.map(([firstName, lastName], i) => ({
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: `97777${String(10000 + i).slice(-5)}`,
      passwordHash: DEMO_PASSWORD,
      role: 'customer' as const,
      profile: { firstName, lastName },
      isVerified: true,
      isPhoneVerified: true,
      preferences: { searchRadius: 5, notifications: {} },
      location: {
        type: 'Point' as const,
        coordinates: [77.4126 + (Math.random() - 0.5) * 0.05, 23.2599 + (Math.random() - 0.5) * 0.05] as [number, number],
        address: 'Bhopal',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        pincode: '462001',
      },
    })),
  );

  console.log(`  ✓ 1 super admin, ${owners.length} owners, ${customers.length} customers`);
  return { admin, owners, customers };
}

async function seedShops(owners: Array<{ _id: mongoose.Types.ObjectId }>, adminId: mongoose.Types.ObjectId) {
  const docs = SHOPS.map((s, i) => {
    const prices = s.items.filter((it) => it.price > 0).map((it) => it.price);

    return {
      ownerId: owners[i]._id,
      slug: toSlug(`${s.name} ${s.landmark}`),
      basicInfo: {
        name: s.name,
        description: s.description,
        category: s.category,
        subCategory: s.subCategory,
        tags: s.tags,
      },
      contact: { phone: s.phone, whatsapp: s.whatsapp, email: s.email, website: s.website },
      location: {
        type: 'Point' as const,
        coordinates: s.coordinates,
        address: s.address,
        landmark: s.landmark,
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        pincode: s.pincode,
        country: 'India',
      },
      media: { photos: [], videos: [] },
      businessHours: s.hours,
      pricing: { currency: 'INR', items: s.items.map((it) => ({ ...it, isAvailable: true })) },
      features: s.features,
      offers: (s.offers ?? []).map((o) => ({
        ...o,
        isActive: true,
        usageCount: 0,
        validFrom: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        validUntil: new Date(Date.now() + 60 * 24 * 3600 * 1000),
      })),
      ratings: { average: 0, total: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      analytics: {
        views: s.views,
        uniqueViews: Math.round(s.views * 0.72),
        callClicks: Math.round(s.views * 0.09),
        directionClicks: Math.round(s.views * 0.06),
        websiteClicks: Math.round(s.views * 0.02),
        shareCount: Math.round(s.views * 0.01),
        saveCount: Math.round(s.views * 0.03),
      },
      verification: {
        status: s.verification,
        verifiedAt: s.verification === 'verified' ? new Date() : undefined,
        verifiedBy: s.verification === 'verified' ? adminId : undefined,
        documents: [],
      },
      subscription: { plan: s.isFeatured ? ('premium' as const) : ('free' as const), features: [] },
      priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 },
      isActive: true,
      isFeatured: Boolean(s.isFeatured),
      featuredUntil: s.isFeatured ? new Date(Date.now() + 30 * 24 * 3600 * 1000) : undefined,
    };
  });

  const shops = await Shop.insertMany(docs);

  // Refresh the denormalised per-category counters from what was actually inserted.
  const counts = await Shop.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$basicInfo.category', total: { $sum: 1 } } },
  ]);

  await Promise.all(
    counts.map((c: { _id: string; total: number }) =>
      Category.updateOne({ slug: c._id }, { $set: { 'stats.shopCount': c.total, 'stats.activeShopCount': c.total } }),
    ),
  );

  console.log(`  ✓ ${shops.length} shops across ${new Set(SHOPS.map((s) => s.category)).size} categories`);
  return shops;
}

async function seedReviews(
  shops: Array<{ _id: mongoose.Types.ObjectId }>,
  customers: Array<{ _id: mongoose.Types.ObjectId }>,
) {
  const reviews: Array<Record<string, unknown>> = [];

  shops.forEach((shop, shopIndex) => {
    const target = SHOPS[shopIndex];
    // Enough reviews to make the breakdown chart meaningful, capped by customer count.
    const count = Math.min(customers.length, 4 + (shopIndex % 4));

    for (let i = 0; i < count; i += 1) {
      const customer = customers[(shopIndex * 3 + i) % customers.length];
      const template = REVIEW_TEMPLATES[(shopIndex + i) % REVIEW_TEMPLATES.length];

      // Nudge ratings toward the shop's intended average.
      const bias = target.seedRating.average >= 4.4 ? 1 : 0;
      const rating = Math.min(5, Math.max(1, template.rating + (i === 0 ? bias : 0)));

      reviews.push({
        shopId: shop._id,
        userId: customer._id,
        rating,
        title: template.title,
        comment: template.comment,
        photos: [],
        helpful: { count: Math.floor(Math.random() * 12), users: [] },
        isVerifiedPurchase: i % 3 === 0,
        isActive: true,
        createdAt: new Date(Date.now() - (i + 1) * 5 * 24 * 3600 * 1000),
      });
    }
  });

  await Review.insertMany(reviews, { ordered: false });

  // Recompute denormalised rating aggregates from the inserted reviews.
  for (const shop of shops) await recalculateRatings(shop._id);

  console.log(`  ✓ ${reviews.length} reviews (rating aggregates recalculated)`);
}

async function seedAnalytics(shops: Array<{ _id: mongoose.Types.ObjectId; basicInfo: { category: string } }>) {
  const queries = [
    'haircut', 'pizza', 'gym membership', 'blood test', 'atta 5kg', 'laptop repair',
    'saree', 'cake', 'plumber', 'cold coffee', 'screen replacement', 'yoga',
  ];

  const events: Array<Record<string, unknown>> = [];
  const now = Date.now();

  for (let day = 0; day < 30; day += 1) {
    const createdAt = new Date(now - day * 24 * 3600 * 1000);

    for (let i = 0; i < 6; i += 1) {
      events.push({
        eventType: 'search',
        query: queries[(day + i) % queries.length],
        resultCount: 1 + ((day + i) % 8),
        location: { lat: 23.2599, lng: 77.4126, city: 'Bhopal' },
        createdAt,
      });
    }

    for (const shop of shops.slice(0, 8)) {
      events.push({ eventType: 'shop_view', shopId: shop._id, shopCategory: shop.basicInfo.category, createdAt });
      if (day % 2 === 0) {
        events.push({ eventType: 'call_click', shopId: shop._id, shopCategory: shop.basicInfo.category, createdAt });
      }
      if (day % 3 === 0) {
        events.push({ eventType: 'direction_click', shopId: shop._id, shopCategory: shop.basicInfo.category, createdAt });
      }
    }
  }

  // A few zero-result searches so the admin "content gap" report is populated.
  for (const q of ['dog grooming', 'car wash', 'tattoo studio']) {
    events.push({ eventType: 'search', query: q, resultCount: 0, createdAt: new Date(now - 3 * 24 * 3600 * 1000) });
  }

  await AnalyticsEvent.insertMany(events, { ordered: false });
  console.log(`  ✓ ${events.length} analytics events (30-day history)`);
}

async function seedSavedShops(
  customers: Array<{ _id: mongoose.Types.ObjectId; savedShops: mongoose.Types.ObjectId[] }>,
  shops: Array<{ _id: mongoose.Types.ObjectId }>,
) {
  await Promise.all(
    customers.slice(0, 6).map((customer, i) =>
      User.updateOne(
        { _id: customer._id },
        { $set: { savedShops: [shops[i % shops.length]._id, shops[(i + 3) % shops.length]._id] } },
      ),
    ),
  );
  console.log('  ✓ Saved-shop lists for 6 customers');
}

/**
 * Populates the database with the Bhopal demo dataset.
 * Exported so the dev server can auto-seed an empty in-memory database
 * (see src/index.ts) as well as being runnable via `npm run seed`.
 */
export async function seedDatabase({ quiet = false } = {}) {
  const startedAt = Date.now();
  const log = quiet ? () => undefined : console.log;

  log('\n🌱 Seeding SHOPZY (Bhopal dataset)\n');

  await wipe();
  await seedCategories();
  const { admin, owners, customers } = await seedUsers();
  const shops = await seedShops(owners, admin._id);
  await seedReviews(shops, customers);
  await seedAnalytics(shops as never);
  await seedSavedShops(customers as never, shops);

  log(`\n✅ Seed complete in ${Date.now() - startedAt}ms\n`);
  log('  Demo accounts');
  log('  ─────────────────────────────────────────────');
  log(`  Super admin : ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD}`);
  log(`  Shop owner  : owner1@shopzy.in / ${DEMO_PASSWORD}`);
  log(`  Customer    : aditya.sharma@example.com / ${DEMO_PASSWORD}`);
  log('  ─────────────────────────────────────────────\n');

  return { shops: shops.length, owners: owners.length, customers: customers.length };
}

async function runCli() {
  await connectDatabase();

  if (env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('Refusing to seed a production database without --force');
    process.exit(1);
  }

  // The seed writes a super-admin account. Creating one with the password
  // published in .env.example would hand over the platform.
  if (env.NODE_ENV === 'production' && env.SEED_ADMIN_PASSWORD === 'Admin@1234') {
    console.error(
      'Refusing to seed: SEED_ADMIN_PASSWORD is still the documented default.\n' +
        'Set a strong SEED_ADMIN_PASSWORD before seeding a production database.',
    );
    process.exit(1);
  }

  await seedDatabase();
  await disconnectDatabase();
  process.exit(0);
}

// Only run automatically when invoked directly (`npm run seed`).
if (require.main === module) {
  runCli().catch((err) => {
    logger.error('Seed failed', { err: (err as Error).message, stack: (err as Error).stack });
    console.error(err);
    process.exit(1);
  });
}
