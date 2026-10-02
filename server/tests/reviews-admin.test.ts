import request from 'supertest';
import { Review, Shop } from '../src/models';
import { API, auth, clearCache, createUser, createUserAndSignIn, getApp, seedShop } from './helpers';

beforeEach(clearCache);

describe('reviews', () => {
  it('creates a review and updates the shop rating aggregate', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'review-target' });

    const res = await request(getApp())
      .post(`${API}/shops/${shop._id}/reviews`)
      .set(auth(token))
      .send({ rating: 5, title: 'Excellent', comment: 'Great service and honest pricing.' });

    expect(res.status).toBe(201);

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.ratings.average).toBe(5);
    expect(fresh!.ratings.total).toBe(1);
    expect(fresh!.ratings.breakdown['5' as unknown as keyof typeof fresh.ratings.breakdown]).toBe(1);
  });

  it('averages multiple ratings correctly', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(owner._id), { slug: 'multi-review' });

    for (const rating of [5, 4, 3]) {
      const { token } = await createUserAndSignIn('customer');
      await request(getApp()).post(`${API}/shops/${shop._id}/reviews`).set(auth(token)).send({ rating });
    }

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.ratings.total).toBe(3);
    expect(fresh!.ratings.average).toBe(4); // (5+4+3)/3
  });

  it('allows only one review per user per shop', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'single-review' });

    await request(getApp()).post(`${API}/shops/${shop._id}/reviews`).set(auth(token)).send({ rating: 5 });
    const second = await request(getApp()).post(`${API}/shops/${shop._id}/reviews`).set(auth(token)).send({ rating: 1 });

    expect(second.status).toBe(409);
  });

  it('stops an owner reviewing their own shop', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'self-review' });

    const res = await request(getApp()).post(`${API}/shops/${shop._id}/reviews`).set(auth(token)).send({ rating: 5 });
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(owner._id), { slug: 'anon-review' });

    const res = await request(getApp()).post(`${API}/shops/${shop._id}/reviews`).send({ rating: 5 });
    expect(res.status).toBe(401);
  });

  it('validates the rating range', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'bad-rating' });

    const res = await request(getApp()).post(`${API}/shops/${shop._id}/reviews`).set(auth(token)).send({ rating: 9 });
    expect(res.status).toBe(422);
  });

  it('recalculates the aggregate after a review is deleted', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'delete-review' });

    const created = await request(getApp())
      .post(`${API}/shops/${shop._id}/reviews`)
      .set(auth(token))
      .send({ rating: 5 });

    await request(getApp()).delete(`${API}/reviews/${created.body.data.id}`).set(auth(token));

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.ratings.total).toBe(0);
    expect(fresh!.ratings.average).toBe(0);
  });

  it('stops a user deleting someone else\'s review', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token: authorToken } = await createUserAndSignIn('customer');
    const { token: strangerToken } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'protected-review' });

    const created = await request(getApp())
      .post(`${API}/shops/${shop._id}/reviews`)
      .set(auth(authorToken))
      .send({ rating: 4 });

    const res = await request(getApp())
      .delete(`${API}/reviews/${created.body.data.id}`)
      .set(auth(strangerToken));

    expect(res.status).toBe(403);
  });

  it('lets the shop owner reply, but not a random user', async () => {
    const { user: owner, token: ownerToken } = await createUserAndSignIn('owner');
    const { token: customerToken } = await createUserAndSignIn('customer');
    const { token: strangerToken } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'reply-shop' });

    const created = await request(getApp())
      .post(`${API}/shops/${shop._id}/reviews`)
      .set(auth(customerToken))
      .send({ rating: 3, comment: 'Average.' });

    const stranger = await request(getApp())
      .post(`${API}/reviews/${created.body.data.id}/reply`)
      .set(auth(strangerToken))
      .send({ comment: 'I am not the owner' });
    expect(stranger.status).toBe(403);

    const byOwner = await request(getApp())
      .post(`${API}/reviews/${created.body.data.id}/reply`)
      .set(auth(ownerToken))
      .send({ comment: 'Thanks for the feedback — we are working on it.' });
    expect(byOwner.status).toBe(200);
  });

  it('toggles the helpful vote', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token: authorToken } = await createUserAndSignIn('customer');
    const { token: voterToken } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'helpful-shop' });

    const created = await request(getApp())
      .post(`${API}/shops/${shop._id}/reviews`)
      .set(auth(authorToken))
      .send({ rating: 5 });

    const up = await request(getApp()).post(`${API}/reviews/${created.body.data.id}/helpful`).set(auth(voterToken));
    expect(up.body.data).toEqual({ helpful: true, count: 1 });

    const down = await request(getApp()).post(`${API}/reviews/${created.body.data.id}/helpful`).set(auth(voterToken));
    expect(down.body.data).toEqual({ helpful: false, count: 0 });
  });

  it('lists reviews with pagination and author details', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(owner._id), { slug: 'list-reviews' });

    for (let i = 0; i < 3; i += 1) {
      const { token } = await createUserAndSignIn('customer');
      await request(getApp()).post(`${API}/shops/${shop._id}/reviews`).set(auth(token)).send({ rating: 4 });
    }

    const res = await request(getApp()).get(`${API}/shops/${shop._id}/reviews`).query({ limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.hasNext).toBe(true);
    expect(res.body.data[0].author.name).toBeDefined();
  });
});

describe('saved shops', () => {
  it('toggles a shop in and out of the saved list', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'savable' });

    const save = await request(getApp()).post(`${API}/me/saved-shops/${shop._id}`).set(auth(token));
    expect(save.body.data.saved).toBe(true);

    const list = await request(getApp()).get(`${API}/me/saved-shops`).set(auth(token));
    expect(list.body.data).toHaveLength(1);

    const unsave = await request(getApp()).post(`${API}/me/saved-shops/${shop._id}`).set(auth(token));
    expect(unsave.body.data.saved).toBe(false);

    const emptyList = await request(getApp()).get(`${API}/me/saved-shops`).set(auth(token));
    expect(emptyList.body.data).toHaveLength(0);
  });
});

describe('admin', () => {
  it('verifies a shop', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token: adminToken } = await createUserAndSignIn('admin');
    const shop = await seedShop(String(owner._id), { slug: 'to-verify', verification: 'pending' });

    const res = await request(getApp())
      .put(`${API}/admin/shops/${shop._id}/verify`)
      .set(auth(adminToken))
      .send({ status: 'verified' });

    expect(res.status).toBe(200);

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.verification.status).toBe('verified');
    expect(fresh!.verification.verifiedAt).toBeDefined();
  });

  it('requires a reason when rejecting', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token: adminToken } = await createUserAndSignIn('admin');
    const shop = await seedShop(String(owner._id), { slug: 'to-reject', verification: 'pending' });

    const noReason = await request(getApp())
      .put(`${API}/admin/shops/${shop._id}/verify`)
      .set(auth(adminToken))
      .send({ status: 'rejected' });
    expect(noReason.status).toBe(422);

    const withReason = await request(getApp())
      .put(`${API}/admin/shops/${shop._id}/verify`)
      .set(auth(adminToken))
      .send({ status: 'rejected', rejectionReason: 'Address does not match documents' });
    expect(withReason.status).toBe(200);
  });

  it('blocks non-admins from every admin route', async () => {
    const { token } = await createUserAndSignIn('owner');

    for (const path of ['/admin/dashboard', '/admin/shops', '/admin/users', '/admin/analytics']) {
      const res = await request(getApp()).get(`${API}${path}`).set(auth(token));
      expect(res.status).toBe(403);
    }
  });

  it('returns dashboard counts', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token: adminToken } = await createUserAndSignIn('admin');
    await seedShop(String(owner._id), { slug: 'counted-shop' });

    const res = await request(getApp()).get(`${API}/admin/dashboard`).set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.counts.activeShops).toBe(1);
    expect(res.body.data.counts.totalUsers).toBeGreaterThanOrEqual(2);
  });

  it('stops an admin suspending another admin', async () => {
    const { token: adminToken } = await createUserAndSignIn('admin');
    const { user: otherAdmin } = await createUser({ role: 'admin' });

    const res = await request(getApp())
      .put(`${API}/admin/users/${otherAdmin._id}/status`)
      .set(auth(adminToken))
      .send({ isActive: false });

    expect(res.status).toBe(403);
  });

  it('suspends a customer and blocks their subsequent requests', async () => {
    const { token: adminToken } = await createUserAndSignIn('admin');
    const { user: customer, token: customerToken } = await createUserAndSignIn('customer');

    const res = await request(getApp())
      .put(`${API}/admin/users/${customer._id}/status`)
      .set(auth(adminToken))
      .send({ isActive: false });
    expect(res.status).toBe(200);

    const blocked = await request(getApp()).get(`${API}/auth/me`).set(auth(customerToken));
    expect(blocked.status).toBe(403);
  });
});

describe('DPDP data rights', () => {
  it('exports the user\'s data', async () => {
    const { token } = await createUserAndSignIn('customer');

    const res = await request(getApp()).get(`${API}/me/export`).set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.reviews).toEqual([]);
  });

  it('anonymises the account on deletion', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { user: customer, token } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'erasure-shop' });

    await request(getApp()).post(`${API}/shops/${shop._id}/reviews`).set(auth(token)).send({ rating: 4 });
    const res = await request(getApp()).delete(`${API}/me/account`).set(auth(token));
    expect(res.status).toBe(200);

    const reviews = await Review.find({ userId: customer._id }).lean();
    expect(reviews.every((r) => r.isActive === false)).toBe(true);
  });
});

describe('health & error handling', () => {
  it('reports liveness', async () => {
    const res = await request(getApp()).get(`${API}/health`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('404s an unknown route with the standard envelope', async () => {
    const res = await request(getApp()).get(`${API}/not-a-real-route`);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('never leaks a stack trace in the error body for client errors', async () => {
    const res = await request(getApp()).get(`${API}/shops`).query({ limit: 999 });
    expect(res.status).toBe(422);
    expect(res.body.error.stack).toBeUndefined();
  });

  it('sets hardening headers', async () => {
    const res = await request(getApp()).get(`${API}/health`);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
