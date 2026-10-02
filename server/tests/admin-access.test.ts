import request from 'supertest';
import { AuditLog, Category, Review, Shop } from '../src/models';
import { API, auth, clearCache, createUser, createUserAndSignIn, getApp, seedCategory, seedShop } from './helpers';

beforeEach(clearCache);

describe('admin access control', () => {
  describe('role changes', () => {
    it('rejects a role change from an ordinary admin', async () => {
      const { token } = await createUserAndSignIn('admin');
      const { user: target } = await createUser({ role: 'customer' });

      const res = await request(getApp())
        .put(`${API}/admin/users/${target._id}/role`)
        .set(auth(token))
        .send({ role: 'owner' });

      expect(res.status).toBe(403);
    });

    it('allows a super admin to change a role', async () => {
      const { token } = await createUserAndSignIn('super_admin');
      const { user: target } = await createUser({ role: 'customer' });

      const res = await request(getApp())
        .put(`${API}/admin/users/${target._id}/role`)
        .set(auth(token))
        .send({ role: 'owner' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('owner');
    });

    it('refuses to let a super admin change their own role', async () => {
      const { token, user } = await createUserAndSignIn('super_admin');

      const res = await request(getApp())
        .put(`${API}/admin/users/${user._id}/role`)
        .set(auth(token))
        .send({ role: 'customer' });

      expect(res.status).toBe(400);
    });
  });

  describe('suspending accounts', () => {
    it('stops an admin from suspending another admin', async () => {
      const { token } = await createUserAndSignIn('admin');
      const { user: otherAdmin } = await createUser({ role: 'admin' });

      const res = await request(getApp())
        .put(`${API}/admin/users/${otherAdmin._id}/status`)
        .set(auth(token))
        .send({ isActive: false });

      expect(res.status).toBe(403);
    });

    it('lets an admin suspend a customer', async () => {
      const { token } = await createUserAndSignIn('admin');
      const { user: customer } = await createUser({ role: 'customer' });

      const res = await request(getApp())
        .put(`${API}/admin/users/${customer._id}/status`)
        .set(auth(token))
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('category deletion', () => {
    it('rejects deletion by an ordinary admin', async () => {
      const { token } = await createUserAndSignIn('admin');
      const category = await seedCategory('gyms', 'Gyms');

      const res = await request(getApp()).delete(`${API}/categories/${category._id}`).set(auth(token));

      expect(res.status).toBe(403);
    });

    it('allows a super admin to deactivate an unused category', async () => {
      const { token } = await createUserAndSignIn('super_admin');
      const category = await seedCategory('gyms', 'Gyms');

      const res = await request(getApp()).delete(`${API}/categories/${category._id}`).set(auth(token));

      expect(res.status).toBe(200);
      const fresh = await Category.findById(category._id).lean();
      expect(fresh!.isActive).toBe(false);
    });

    it('refuses to deactivate a category that active shops still use', async () => {
      const { token } = await createUserAndSignIn('super_admin');
      const { user: owner } = await createUser({ role: 'owner' });
      const category = await seedCategory('salons', 'Salons');
      await seedShop(String(owner._id), { slug: 'in-use-salon', category: 'salons' });

      const res = await request(getApp()).delete(`${API}/categories/${category._id}`).set(auth(token));

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/still use this category/i);
    });
  });

  describe('admin override on shops', () => {
    it('lets an admin edit a shop they do not own', async () => {
      const { token } = await createUserAndSignIn('admin');
      const { user: owner } = await createUser({ role: 'owner' });
      const shop = await seedShop(String(owner._id), { slug: 'someone-elses-shop' });

      const res = await request(getApp())
        .put(`${API}/shops/${shop._id}`)
        .set(auth(token))
        .send({ items: [{ name: 'Beard Trim', price: 120, isAvailable: true }] });

      expect(res.status).toBe(200);

      const fresh = await Shop.findById(shop._id).lean();
      expect(fresh!.pricing.items).toHaveLength(1);
      expect(fresh!.pricing.items[0].name).toBe('Beard Trim');
    });

    it('still blocks an owner from editing a shop they do not own', async () => {
      const { user: owner } = await createUser({ role: 'owner' });
      const { token: otherOwnerToken } = await createUserAndSignIn('owner');
      const shop = await seedShop(String(owner._id), { slug: 'not-yours' });

      const res = await request(getApp())
        .put(`${API}/shops/${shop._id}`)
        .set(auth(otherOwnerToken))
        .send({ items: [] });

      expect(res.status).toBe(403);
    });
  });
});

describe('audit log', () => {
  it('records an entry when an admin verifies a shop', async () => {
    const { token, user: admin } = await createUserAndSignIn('admin');
    const { user: owner } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(owner._id), { slug: 'audit-verify', verification: 'pending' });

    await request(getApp())
      .put(`${API}/admin/shops/${shop._id}/verify`)
      .set(auth(token))
      .send({ status: 'verified' });

    const entry = await AuditLog.findOne({ action: 'shop.verify', targetId: String(shop._id) }).lean();

    expect(entry).toBeTruthy();
    expect(entry!.actorEmail).toBe(admin.email);
    expect(entry!.before).toMatchObject({ status: 'pending' });
    expect(entry!.after).toMatchObject({ status: 'verified' });
  });

  it('keeps the rejection reason on the entry', async () => {
    const { token } = await createUserAndSignIn('admin');
    const { user: owner } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(owner._id), { slug: 'audit-reject' });

    await request(getApp())
      .put(`${API}/admin/shops/${shop._id}/verify`)
      .set(auth(token))
      .send({ status: 'rejected', rejectionReason: 'Address could not be confirmed' });

    const entry = await AuditLog.findOne({ action: 'shop.verify', targetId: String(shop._id) }).lean();
    expect(entry!.reason).toBe('Address could not be confirmed');
  });

  it('records an admin editing a shop they do not own', async () => {
    const { token } = await createUserAndSignIn('admin');
    const { user: owner } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(owner._id), { slug: 'audit-admin-edit' });

    await request(getApp())
      .put(`${API}/shops/${shop._id}`)
      .set(auth(token))
      .send({ description: 'Edited by an admin' });

    const entry = await AuditLog.findOne({ action: 'shop.update', targetId: String(shop._id) }).lean();
    expect(entry).toBeTruthy();
    expect(entry!.after).toMatchObject({ fields: ['description'] });
  });

  it('does not record an owner editing their own shop', async () => {
    const { token, user: owner } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(owner._id), { slug: 'audit-owner-edit' });

    await request(getApp())
      .put(`${API}/shops/${shop._id}`)
      .set(auth(token))
      .send({ description: 'Routine owner edit' });

    const count = await AuditLog.countDocuments({ action: 'shop.update', targetId: String(shop._id) });
    expect(count).toBe(0);
  });

  it('exposes entries through the audit endpoint, newest first', async () => {
    const { token } = await createUserAndSignIn('admin');
    const { user: owner } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(owner._id), { slug: 'audit-listing' });

    await request(getApp()).put(`${API}/admin/shops/${shop._id}/featured`).set(auth(token));
    await request(getApp()).put(`${API}/admin/shops/${shop._id}/active`).set(auth(token));

    const res = await request(getApp()).get(`${API}/admin/audit`).set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0].action).toBe('shop.active');
    expect(res.body.data[1].action).toBe('shop.featured');
  });

  it('filters entries by action', async () => {
    const { token } = await createUserAndSignIn('admin');
    const { user: owner } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(owner._id), { slug: 'audit-filter' });

    await request(getApp()).put(`${API}/admin/shops/${shop._id}/featured`).set(auth(token));
    await request(getApp()).put(`${API}/admin/shops/${shop._id}/active`).set(auth(token));

    const res = await request(getApp()).get(`${API}/admin/audit`).query({ action: 'shop.featured' }).set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].action).toBe('shop.featured');
  });

  it('rejects an unknown action filter', async () => {
    const { token } = await createUserAndSignIn('admin');

    const res = await request(getApp()).get(`${API}/admin/audit`).query({ action: 'shop.nuke' }).set(auth(token));

    expect(res.status).toBe(422);
  });
});

describe('review moderation', () => {
  it('recalculates the shop rating when a review is hidden', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(owner._id), { slug: 'moderation-target' });

    for (const rating of [5, 1]) {
      const { token } = await createUserAndSignIn('customer');
      await request(getApp()).post(`${API}/shops/${shop._id}/reviews`).set(auth(token)).send({ rating });
    }

    const before = await Shop.findById(shop._id).lean();
    expect(before!.ratings.average).toBe(3); // (5 + 1) / 2

    const oneStar = await Review.findOne({ shopId: shop._id, rating: 1 }).lean();
    const { token: adminToken } = await createUserAndSignIn('admin');

    const res = await request(getApp())
      .put(`${API}/admin/reviews/${oneStar!._id}/moderate`)
      .set(auth(adminToken))
      .send({ isActive: false });

    expect(res.status).toBe(200);

    const after = await Shop.findById(shop._id).lean();
    expect(after!.ratings.average).toBe(5);
    expect(after!.ratings.total).toBe(1);
  });

  it('records the pre-moderation state in the audit log', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const shop = await seedShop(String(owner._id), { slug: 'moderation-audit' });
    const { token: customerToken } = await createUserAndSignIn('customer');

    await request(getApp())
      .post(`${API}/shops/${shop._id}/reviews`)
      .set(auth(customerToken))
      .send({ rating: 2, title: 'Not great' });

    const review = await Review.findOne({ shopId: shop._id }).lean();
    const { token: adminToken } = await createUserAndSignIn('admin');

    await request(getApp())
      .put(`${API}/admin/reviews/${review!._id}/moderate`)
      .set(auth(adminToken))
      .send({ isActive: false });

    const entry = await AuditLog.findOne({ action: 'review.moderate', targetId: String(review!._id) }).lean();
    expect(entry!.targetLabel).toBe('Not great');
    expect(entry!.before).toMatchObject({ isActive: true });
    expect(entry!.after).toMatchObject({ isActive: false });
  });
});

describe('admin categories endpoint', () => {
  it('includes deactivated categories, unlike the public list', async () => {
    const { token } = await createUserAndSignIn('super_admin');
    const category = await seedCategory('gyms', 'Gyms');
    await request(getApp()).delete(`${API}/categories/${category._id}`).set(auth(token));

    const publicRes = await request(getApp()).get(`${API}/categories`);
    expect(publicRes.body.data.some((c: { slug: string }) => c.slug === 'gyms')).toBe(false);

    const adminRes = await request(getApp()).get(`${API}/admin/categories`).set(auth(token));
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.some((c: { slug: string }) => c.slug === 'gyms')).toBe(true);
  });

  it('is closed to non-admins', async () => {
    const { token } = await createUserAndSignIn('customer');
    const res = await request(getApp()).get(`${API}/admin/categories`).set(auth(token));
    expect(res.status).toBe(403);
  });
});
