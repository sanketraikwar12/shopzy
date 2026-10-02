import fs from 'fs';
import request from 'supertest';
import { Shop } from '../src/models';
import { UPLOAD_ROOT } from '../src/middleware/upload';
import {
  API,
  auth,
  clearCache,
  createUser,
  createUserAndSignIn,
  getApp,
  seedCategory,
  seedShop,
} from './helpers';

// Real Bhopal localities, roughly 4 km apart.
const MP_NAGAR: [number, number] = [77.4348, 23.2332];
const ARERA_COLONY: [number, number] = [77.4256, 23.2178];
const FAR_AWAY: [number, number] = [75.8577, 22.7196]; // Indore, ~190 km

beforeEach(clearCache);

describe('GET /shops — search', () => {
  it('returns active shops and pagination metadata', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedCategory();
    await seedShop(String(user._id), { name: 'Alpha Salon', slug: 'alpha-salon' });
    await seedShop(String(user._id), { name: 'Beta Salon', slug: 'beta-salon' });

    const res = await request(getApp()).get(`${API}/shops`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.meta.page).toBe(1);
  });

  it('excludes soft-deleted shops', async () => {
    const { user } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(user._id), { slug: 'hidden-shop' });
    await Shop.updateOne({ _id: shop._id }, { $set: { isActive: false } });

    const res = await request(getApp()).get(`${API}/shops`);
    expect(res.body.data).toHaveLength(0);
  });

  it('filters by distance using the 2dsphere index', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedShop(String(user._id), { name: 'Near Shop', slug: 'near-shop', coordinates: MP_NAGAR });
    await seedShop(String(user._id), { name: 'Far Shop', slug: 'far-shop', coordinates: FAR_AWAY });

    const res = await request(getApp())
      .get(`${API}/shops`)
      .query({ lat: MP_NAGAR[1], lng: MP_NAGAR[0], radius: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Near Shop');
    expect(res.body.data[0].distanceKm).toBeLessThan(1);
  });

  it('sorts by distance, nearest first', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedShop(String(user._id), { name: 'Arera Shop', slug: 'arera-shop', coordinates: ARERA_COLONY });
    await seedShop(String(user._id), { name: 'MP Nagar Shop', slug: 'mp-nagar-shop', coordinates: MP_NAGAR });

    const res = await request(getApp())
      .get(`${API}/shops`)
      .query({ lat: MP_NAGAR[1], lng: MP_NAGAR[0], radius: 25, sort: 'distance' });

    expect(res.body.data.map((s: { name: string }) => s.name)).toEqual(['MP Nagar Shop', 'Arera Shop']);
  });

  it('matches a query against price-list item names', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedShop(String(user._id), {
      name: 'Generic Store',
      slug: 'generic-store',
      items: [{ name: 'Cappuccino', price: 130 }],
    });
    await seedShop(String(user._id), { name: 'Other Store', slug: 'other-store', items: [{ name: 'Sandwich', price: 90 }] });

    const res = await request(getApp()).get(`${API}/shops`).query({ q: 'cappuccino' });

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Generic Store');
  });

  it('filters by minimum rating', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedShop(String(user._id), { name: 'Great', slug: 'great', rating: 4.6 });
    await seedShop(String(user._id), { name: 'Poor', slug: 'poor', rating: 2.1 });

    const res = await request(getApp()).get(`${API}/shops`).query({ minRating: 4 });

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Great');
  });

  it('filters by max price against the denormalised price range', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedShop(String(user._id), { name: 'Budget', slug: 'budget', items: [{ name: 'Cut', price: 100 }] });
    await seedShop(String(user._id), { name: 'Luxury', slug: 'luxury', items: [{ name: 'Cut', price: 5000 }] });

    const res = await request(getApp()).get(`${API}/shops`).query({ maxPrice: 500 });

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Budget');
  });

  it('filters to open shops only', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedShop(String(user._id), { name: 'Always Open', slug: 'always-open', alwaysOpen: true });
    await seedShop(String(user._id), { name: 'Always Shut', slug: 'always-shut', alwaysOpen: false });

    const res = await request(getApp()).get(`${API}/shops`).query({ openNow: 'true' });

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Always Open');
  });

  it('returns category and rating facets', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedShop(String(user._id), { slug: 'facet-a', category: 'salons', rating: 4.5 });
    await seedShop(String(user._id), { slug: 'facet-b', category: 'restaurants', rating: 4.2 });

    const res = await request(getApp()).get(`${API}/shops`);

    expect(res.body.meta.facets.categories).toEqual(
      expect.arrayContaining([{ value: 'salons', count: 1 }, { value: 'restaurants', count: 1 }]),
    );
    expect(res.body.meta.facets.ratings.find((r: { value: number }) => r.value === 4).count).toBe(2);
  });

  it('rejects lat without lng', async () => {
    const res = await request(getApp()).get(`${API}/shops`).query({ lat: 23.2 });
    expect(res.status).toBe(422);
  });

  it('caps the page size', async () => {
    const res = await request(getApp()).get(`${API}/shops`).query({ limit: 500 });
    expect(res.status).toBe(422);
  });
});

describe('GET /shops/compare — price comparison', () => {
  it('ranks the same item across shops, cheapest first', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedShop(String(user._id), {
      name: 'Expensive Salon',
      slug: 'expensive-salon',
      coordinates: MP_NAGAR,
      items: [{ name: 'Haircut (Men)', price: 400 }],
    });
    await seedShop(String(user._id), {
      name: 'Cheap Salon',
      slug: 'cheap-salon',
      coordinates: ARERA_COLONY,
      items: [{ name: 'Haircut (Men)', price: 150 }],
    });

    const res = await request(getApp())
      .get(`${API}/shops/compare`)
      .query({ item: 'Haircut', lat: MP_NAGAR[1], lng: MP_NAGAR[0], radius: 25 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].item.price).toBe(150);
    expect(res.body.data[0].isCheapest).toBe(true);
    expect(res.body.data[1].isCheapest).toBe(false);
    expect(res.body.meta.stats).toMatchObject({ min: 150, max: 400, count: 2 });
    expect(res.body.data[0].savingsVsMax).toBe(250);
  });

  it('excludes unavailable items', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedShop(String(user._id), {
      slug: 'partial-stock',
      items: [{ name: 'Widget', price: 100, isAvailable: false }],
    });

    const res = await request(getApp()).get(`${API}/shops/compare`).query({ item: 'Widget' });
    expect(res.body.data).toHaveLength(0);
  });

  it('requires at least two characters', async () => {
    const res = await request(getApp()).get(`${API}/shops/compare`).query({ item: 'a' });
    expect(res.status).toBe(422);
  });
});

describe('GET /shops/suggest — autocomplete', () => {
  it('suggests shops by name prefix and items by substring', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedShop(String(user._id), {
      name: 'Studio Nine',
      slug: 'studio-nine',
      items: [{ name: 'Hair Spa', price: 1200 }],
    });

    const byName = await request(getApp()).get(`${API}/shops/suggest`).query({ q: 'stu' });
    expect(byName.body.data.some((s: { label: string }) => s.label === 'Studio Nine')).toBe(true);

    const byItem = await request(getApp()).get(`${API}/shops/suggest`).query({ q: 'hair spa' });
    expect(byItem.body.data.some((s: { type: string }) => s.type === 'item')).toBe(true);
  });
});

describe('GET /shops/:slug', () => {
  it('returns full detail and increments the view counter', async () => {
    const { user } = await createUser({ role: 'owner' });
    await seedShop(String(user._id), { name: 'Detail Shop', slug: 'detail-shop' });

    const res = await request(getApp()).get(`${API}/shops/detail-shop`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Detail Shop');
    expect(res.body.data.pricing.items).toHaveLength(1);
    expect(res.body.data.businessHours).toBeDefined();

    // Analytics is fire-and-forget, so give it a tick.
    await new Promise((r) => setTimeout(r, 120));
    const fresh = await Shop.findOne({ slug: 'detail-shop' }).lean();
    expect(fresh!.analytics.views).toBe(1);
  });

  it('404s for an unknown slug', async () => {
    const res = await request(getApp()).get(`${API}/shops/does-not-exist`);
    expect(res.status).toBe(404);
  });
});

describe('shop mutations & ownership', () => {
  it('lets an owner create a shop', async () => {
    const { token } = await createUserAndSignIn('owner');
    await seedCategory();

    const res = await request(getApp())
      .post(`${API}/shops`)
      .set(auth(token))
      .send({
        name: 'My New Salon',
        category: 'salons',
        phone: '9826111222',
        lat: 23.2599,
        lng: 77.4126,
        address: '12 Test Street',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        pincode: '462011',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('my-new-salon-bhopal');
    // New listings always start unverified regardless of what the client sends.
    expect(res.body.data.verification.status).toBe('pending');
  });

  it('blocks a customer from creating a shop', async () => {
    const { token } = await createUserAndSignIn('customer');

    const res = await request(getApp()).post(`${API}/shops`).set(auth(token)).send({
      name: 'Not Allowed',
      category: 'salons',
      phone: '9826111333',
      lat: 23.2,
      lng: 77.4,
      address: '1 Street',
      city: 'Bhopal',
      state: 'MP',
      pincode: '462011',
    });

    expect(res.status).toBe(403);
  });

  it('prevents one owner from editing another owner\'s shop', async () => {
    const { user: ownerA } = await createUser({ role: 'owner' });
    const { token: tokenB } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(ownerA._id), { slug: 'owner-a-shop' });

    const res = await request(getApp())
      .put(`${API}/shops/${shop._id}`)
      .set(auth(tokenB))
      .send({ name: 'Hijacked' });

    expect(res.status).toBe(403);
  });

  it('lets the owner update their own shop and recomputes the price range', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'my-shop' });

    const res = await request(getApp())
      .put(`${API}/shops/${shop._id}`)
      .set(auth(token))
      .send({ items: [{ name: 'Deluxe Cut', price: 900 }, { name: 'Basic Cut', price: 120 }] });

    expect(res.status).toBe(200);

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.priceRange).toEqual({ min: 120, max: 900 });
  });

  it('soft-deletes rather than dropping the document', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'to-delete' });

    const res = await request(getApp()).delete(`${API}/shops/${shop._id}`).set(auth(token));
    expect(res.status).toBe(200);

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh).not.toBeNull();
    expect(fresh!.isActive).toBe(false);
  });

  it('rejects a malformed object id', async () => {
    const { token } = await createUserAndSignIn('owner');
    const res = await request(getApp()).put(`${API}/shops/not-an-id`).set(auth(token)).send({ name: 'x' });
    expect(res.status).toBe(422);
  });
});

describe('GET /shops — hasOffers filter', () => {
  const activeOffer = {
    title: '20% off',
    discountType: 'percentage' as const,
    discountValue: 20,
    isActive: true,
    usageCount: 0,
    validFrom: new Date(Date.now() - 86_400_000),
    validUntil: new Date(Date.now() + 86_400_000),
  };

  it('returns only shops with a live offer', async () => {
    const { user } = await createUser({ role: 'owner' });
    const withOffer = await seedShop(String(user._id), { name: 'Has Offer', slug: 'has-offer' });
    await seedShop(String(user._id), { name: 'No Offer', slug: 'no-offer' });

    await Shop.updateOne({ _id: withOffer._id }, { $set: { offers: [activeOffer] } });

    const res = await request(getApp()).get(`${API}/shops`).query({ hasOffers: 'true' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Has Offer');
    expect(res.body.data[0].offerCount).toBe(1);
  });

  it('excludes an expired offer', async () => {
    const { user } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(user._id), { slug: 'expired-offer' });

    await Shop.updateOne(
      { _id: shop._id },
      { $set: { offers: [{ ...activeOffer, validUntil: new Date(Date.now() - 3_600_000) }] } },
    );

    const res = await request(getApp()).get(`${API}/shops`).query({ hasOffers: 'true' });
    expect(res.body.data).toHaveLength(0);
  });

  it('excludes an offer that has not started yet', async () => {
    const { user } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(user._id), { slug: 'future-offer' });

    await Shop.updateOne(
      { _id: shop._id },
      { $set: { offers: [{ ...activeOffer, validFrom: new Date(Date.now() + 86_400_000) }] } },
    );

    const res = await request(getApp()).get(`${API}/shops`).query({ hasOffers: 'true' });
    expect(res.body.data).toHaveLength(0);
  });

  it('excludes an offer that has hit its usage limit', async () => {
    const { user } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(user._id), { slug: 'exhausted-offer' });

    await Shop.updateOne(
      { _id: shop._id },
      { $set: { offers: [{ ...activeOffer, usageLimit: 10, usageCount: 10 }] } },
    );

    const res = await request(getApp()).get(`${API}/shops`).query({ hasOffers: 'true' });
    // Must agree with the serializer: a shop that would render 0 offers must not match.
    expect(res.body.data).toHaveLength(0);
  });

  it('excludes an offer that is switched off', async () => {
    const { user } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(user._id), { slug: 'inactive-offer' });

    await Shop.updateOne({ _id: shop._id }, { $set: { offers: [{ ...activeOffer, isActive: false }] } });

    const res = await request(getApp()).get(`${API}/shops`).query({ hasOffers: 'true' });
    expect(res.body.data).toHaveLength(0);
  });

  it('combines with geo search', async () => {
    const { user } = await createUser({ role: 'owner' });
    const near = await seedShop(String(user._id), { slug: 'near-offer', coordinates: MP_NAGAR });
    const far = await seedShop(String(user._id), { slug: 'far-offer', coordinates: FAR_AWAY });

    await Shop.updateMany({ _id: { $in: [near._id, far._id] } }, { $set: { offers: [activeOffer] } });

    const res = await request(getApp())
      .get(`${API}/shops`)
      .query({ hasOffers: 'true', lat: MP_NAGAR[1], lng: MP_NAGAR[0], radius: 10 });

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe('near-offer');
  });
});

describe('shop photos & opening hours (owner dashboard)', () => {
  // A 1x1 PNG — smallest thing multer will accept as an image.
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  );

  it('uploads photos and adopts the first one as the cover image', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'photo-shop' });

    const res = await request(getApp())
      .post(`${API}/shops/${shop._id}/images`)
      .set(auth(token))
      .attach('images', PNG, 'front.png')
      .attach('images', PNG, 'inside.png');

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(2);

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.media.photos).toHaveLength(2);
    expect(fresh!.media.coverImage).toBe(fresh!.media.photos[0].url);
  });

  it('rejects a non-image upload', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'bad-upload-shop' });

    const res = await request(getApp())
      .post(`${API}/shops/${shop._id}/images`)
      .set(auth(token))
      .attach('images', Buffer.from('#!/bin/sh\n'), 'payload.sh');

    expect(res.status).toBe(400);
    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.media.photos).toHaveLength(0);
  });

  it("blocks uploading to another owner's shop and leaves no file behind", async () => {
    const { user: ownerA } = await createUser({ role: 'owner' });
    const { token: tokenB } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(ownerA._id), { slug: 'not-yours-shop' });

    const before = fs.existsSync(UPLOAD_ROOT) ? fs.readdirSync(UPLOAD_ROOT).length : 0;

    const res = await request(getApp())
      .post(`${API}/shops/${shop._id}/images`)
      .set(auth(tokenB))
      .attach('images', PNG, 'front.png');

    expect(res.status).toBe(403);
    // Multer writes before the ownership check, so the rejected file must be reclaimed.
    expect(fs.readdirSync(UPLOAD_ROOT).length).toBe(before);
  });

  it('deletes a photo and promotes the next one to cover', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'delete-photo-shop' });

    const uploaded = await request(getApp())
      .post(`${API}/shops/${shop._id}/images`)
      .set(auth(token))
      .attach('images', PNG, 'a.png')
      .attach('images', PNG, 'b.png');

    const [first, second] = uploaded.body.data.photos as Array<{ url: string }>;

    const res = await request(getApp())
      .delete(`${API}/shops/${shop._id}/images`)
      .query({ url: first.url })
      .set(auth(token));

    expect(res.status).toBe(200);

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.media.photos.map((p) => p.url)).toEqual([second.url]);
    expect(fresh!.media.coverImage).toBe(second.url);
  });

  it('404s when deleting a photo the shop does not have', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'no-such-photo-shop' });

    const res = await request(getApp())
      .delete(`${API}/shops/${shop._id}/images`)
      .query({ url: '/static/uploads/ghost.jpg' })
      .set(auth(token));

    expect(res.status).toBe(404);
  });

  it('updates the weekly timetable without wiping holiday overrides', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'hours-shop' });

    const holiday = { date: new Date('2026-01-26'), isOpen: false, reason: 'Republic Day' };
    await Shop.updateOne({ _id: shop._id }, { $set: { 'businessHours.specialHours': [holiday] } });

    const res = await request(getApp())
      .put(`${API}/shops/${shop._id}`)
      .set(auth(token))
      .send({
        businessHours: {
          timezone: 'Asia/Kolkata',
          schedule: {
            monday: { isOpen: true, open: '09:30', close: '20:00' },
            sunday: { isOpen: false },
          },
        },
      });

    expect(res.status).toBe(200);

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.businessHours.schedule.monday).toMatchObject({ open: '09:30', close: '20:00', isOpen: true });
    expect(fresh!.businessHours.schedule.sunday.isOpen).toBe(false);
    expect(fresh!.businessHours.specialHours).toHaveLength(1);
    expect(fresh!.businessHours.specialHours[0].reason).toBe('Republic Day');
  });

  it('rejects a malformed opening time', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'bad-hours-shop' });

    const res = await request(getApp())
      .put(`${API}/shops/${shop._id}`)
      .set(auth(token))
      .send({ businessHours: { schedule: { monday: { isOpen: true, open: '25:00', close: '20:00' } } } });

    expect(res.status).toBe(422);
  });

  it('setting a cover image leaves the logo intact', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'cover-shop' });
    await Shop.updateOne({ _id: shop._id }, { $set: { 'media.logo': '/static/uploads/logo.png' } });

    const res = await request(getApp())
      .put(`${API}/shops/${shop._id}`)
      .set(auth(token))
      .send({ coverImage: '/static/uploads/cover.png' });

    expect(res.status).toBe(200);

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.media.coverImage).toBe('/static/uploads/cover.png');
    expect(fresh!.media.logo).toBe('/static/uploads/logo.png');
  });
});
