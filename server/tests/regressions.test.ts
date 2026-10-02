/**
 * Regression tests for bugs found during the production-readiness review.
 *
 * Each block documents the specific defect it pins down, so a future
 * refactor that reintroduces one fails here with an explanation.
 */
import request from 'supertest';
import { Review, Shop, User } from '../src/models';
import { getOpenState } from '../src/utils/hours';
import { escapeRegex } from '../src/utils/slug';
import { isStaleAfterPasswordChange } from '../src/utils/token';
import {
  API,
  STRONG_PASSWORD,
  auth,
  clearCache,
  createUser,
  createUserAndSignIn,
  getApp,
  seedShop,
  signIn,
  uniqueEmail,
} from './helpers';

beforeEach(clearCache);

// ---------------------------------------------------------------------------
// Search: an over-long query used to build an invalid RegExp and return 500.
// escapeRegex sliced *after* escaping, which could cut a `\x` pair in half.
// ---------------------------------------------------------------------------
describe('search query escaping', () => {
  it('never produces an invalid regular expression', () => {
    for (const q of ['a'.repeat(99) + '.', 'a'.repeat(99) + '(', 'b'.repeat(120) + '\\']) {
      expect(() => new RegExp(escapeRegex(q))).not.toThrow();
    }
  });

  it('answers 200 for a query whose escape lands on the truncation boundary', async () => {
    const res = await request(getApp()).get(`${API}/shops`).query({ q: 'a'.repeat(99) + '.' });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Account erasure: every deleted user was given the same placeholder phone,
// so the second deletion collided on the unique index and returned 500.
// ---------------------------------------------------------------------------
describe('account deletion', () => {
  it('lets more than one account be erased', async () => {
    const first = await createUserAndSignIn('customer');
    const second = await createUserAndSignIn('customer');

    const a = await request(getApp()).delete(`${API}/me/account`).set(auth(first.token));
    const b = await request(getApp()).delete(`${API}/me/account`).set(auth(second.token));

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);

    const rows = await User.find({ _id: { $in: [first.user._id, second.user._id] } })
      .select('phone isActive')
      .lean();

    expect(rows.every((r) => r.isActive === false)).toBe(true);
    // Distinct placeholders are what keep the unique index satisfied.
    expect(new Set(rows.map((r) => r.phone)).size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Shop claiming: any authenticated user could POST /claim against any shop,
// flipping a verified listing back to under_review and growing the documents
// array without bound.
// ---------------------------------------------------------------------------
describe('shop claim', () => {
  it('refuses to reopen a verified listing', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token: stranger } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'verified-claim-shop', verification: 'verified' });

    const res = await request(getApp()).post(`${API}/shops/${shop._id}/claim`).set(auth(stranger));

    expect(res.status).toBe(409);

    const fresh = await Shop.findById(shop._id).select('verification').lean();
    expect(fresh!.verification.status).toBe('verified');
    expect(fresh!.verification.documents).toHaveLength(0);
  });

  it('accepts one claim per user on an unverified listing and rejects duplicates', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token: stranger } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'pending-claim-shop', verification: 'pending' });

    const first = await request(getApp()).post(`${API}/shops/${shop._id}/claim`).set(auth(stranger));
    const second = await request(getApp()).post(`${API}/shops/${shop._id}/claim`).set(auth(stranger));

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);

    const fresh = await Shop.findById(shop._id).select('verification').lean();
    expect(fresh!.verification.documents).toHaveLength(1);
  });

  it('rejects an owner claiming their own listing', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'own-claim-shop', verification: 'pending' });

    const res = await request(getApp()).post(`${API}/shops/${shop._id}/claim`).set(auth(token));
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// URL validation: z.string().url() accepts javascript:, which reached an href
// in the SPA as stored XSS.
// ---------------------------------------------------------------------------
describe('url validation', () => {
  const shopPayload = (website: string) => ({
    name: 'Scheme Test Shop',
    category: 'salons',
    phone: '9826000001',
    lat: 23.2599,
    lng: 77.4126,
    address: '12 Test Road',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462011',
    website,
  });

  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)'])(
    'rejects %s as a shop website',
    async (website) => {
      const { token } = await createUserAndSignIn('owner');
      const res = await request(getApp()).post(`${API}/shops`).set(auth(token)).send(shopPayload(website));
      expect(res.status).toBe(422);
    },
  );

  it('accepts an https website', async () => {
    const { token } = await createUserAndSignIn('owner');
    const res = await request(getApp())
      .post(`${API}/shops`)
      .set(auth(token))
      .send(shopPayload('https://example.com'));
    expect(res.status).toBe(201);
  });

  it('rejects a javascript: review photo url', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'review-photo-shop' });

    const res = await request(getApp())
      .post(`${API}/shops/${shop._id}/reviews`)
      .set(auth(token))
      .send({ rating: 5, photos: [{ url: 'javascript:alert(1)' }] });

    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// Password changes must invalidate tokens minted beforehand, or an attacker
// keeps access after the victim resets their password.
// ---------------------------------------------------------------------------
describe('password change revokes older sessions', () => {
  it('treats a token from a different password epoch as stale', () => {
    const changedAt = new Date('2026-08-10T12:00:00Z');

    // The token carries the epoch it was minted against; only an exact match
    // is accepted, so both older and absent epochs are rejected.
    expect(isStaleAfterPasswordChange(changedAt.getTime(), changedAt)).toBe(false);
    expect(isStaleAfterPasswordChange(new Date('2026-08-09T12:00:00Z').getTime(), changedAt)).toBe(true);
    expect(isStaleAfterPasswordChange(undefined, changedAt)).toBe(true);
    expect(isStaleAfterPasswordChange(0, changedAt)).toBe(true);
    // Never changed: a token with no epoch is still valid.
    expect(isStaleAfterPasswordChange(0, undefined)).toBe(false);
    expect(isStaleAfterPasswordChange(undefined, undefined)).toBe(false);
  });

  it('rejects the old access token after a password change', async () => {
    const email = uniqueEmail('rotate');
    const { user } = await createUser({ email, role: 'customer' });
    const oldToken = await signIn(email);

    // Confirm the token works before the change.
    expect((await request(getApp()).get(`${API}/auth/me`).set(auth(oldToken))).status).toBe(200);

    const changed = await request(getApp())
      .post(`${API}/auth/change-password`)
      .set(auth(oldToken))
      .send({ currentPassword: STRONG_PASSWORD, newPassword: 'Rotated@2026' });

    expect(changed.status).toBe(200);

    const reused = await request(getApp()).get(`${API}/auth/me`).set(auth(oldToken));
    expect(reused.status).toBe(401);

    // The caller that performed the change gets fresh, working credentials.
    const freshToken = changed.body.data.tokens.accessToken as string;
    expect((await request(getApp()).get(`${API}/auth/me`).set(auth(freshToken))).status).toBe(200);

    expect(await User.findById(user._id).select('passwordChangedAt').lean()).toHaveProperty('passwordChangedAt');
  });

  it('rejects a refresh token issued before the password changed', async () => {
    const email = uniqueEmail('refresh-rotate');
    await createUser({ email, role: 'customer' });

    const login = await request(getApp()).post(`${API}/auth/login`).send({ identifier: email, password: STRONG_PASSWORD });
    const oldRefresh = login.body.data.tokens.refreshToken as string;
    const accessToken = login.body.data.tokens.accessToken as string;

    await request(getApp())
      .post(`${API}/auth/change-password`)
      .set(auth(accessToken))
      .send({ currentPassword: STRONG_PASSWORD, newPassword: 'Rotated@2026' });

    const res = await request(getApp()).post(`${API}/auth/refresh`).send({ refreshToken: oldRefresh });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// openNow was applied after $skip/$limit, so a page could come back short
// while `total` still counted closed shops.
// ---------------------------------------------------------------------------
describe('openNow pagination', () => {
  it('reports a total that matches the shops actually returned', async () => {
    const { user: owner } = await createUser({ role: 'owner' });

    // Three open, two closed.
    for (let i = 0; i < 3; i += 1) {
      await seedShop(String(owner._id), { slug: `open-shop-${i}`, name: `Open Shop ${i}`, alwaysOpen: true });
    }
    for (let i = 0; i < 2; i += 1) {
      await seedShop(String(owner._id), { slug: `shut-shop-${i}`, name: `Shut Shop ${i}`, alwaysOpen: false });
    }

    const res = await request(getApp()).get(`${API}/shops`).query({ openNow: 'true', limit: 50 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.totalPages).toBe(1);
  });

  it('fills a page fully when later candidates are closed', async () => {
    const { user: owner } = await createUser({ role: 'owner' });

    await seedShop(String(owner._id), { slug: 'shut-first', name: 'AAA Shut', alwaysOpen: false });
    for (let i = 0; i < 4; i += 1) {
      await seedShop(String(owner._id), { slug: `open-later-${i}`, name: `BBB Open ${i}`, alwaysOpen: true });
    }

    const res = await request(getApp()).get(`${API}/shops`).query({ openNow: 'true', limit: 2, page: 1 });

    expect(res.status).toBe(200);
    // Previously the closed shop was removed from the page after slicing,
    // yielding one row instead of the requested two.
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
describe('reviews', () => {
  it('flags the caller\'s own review via isMine', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'is-mine-shop' });

    await request(getApp()).post(`${API}/shops/${shop._id}/reviews`).set(auth(token)).send({ rating: 4 });

    // The route previously had no optionalAuth, so isMine was always false.
    const authed = await request(getApp()).get(`${API}/shops/${shop._id}/reviews`).set(auth(token));
    expect(authed.body.data[0].isMine).toBe(true);

    const anon = await request(getApp()).get(`${API}/shops/${shop._id}/reviews`);
    expect(anon.body.data[0].isMine).toBe(false);
  });

  it('allows reviewing again after deleting a review', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 're-review-shop' });

    const created = await request(getApp())
      .post(`${API}/shops/${shop._id}/reviews`)
      .set(auth(token))
      .send({ rating: 2, comment: 'First attempt' });
    expect(created.status).toBe(201);

    const removed = await request(getApp()).delete(`${API}/reviews/${created.body.data.id}`).set(auth(token));
    expect(removed.status).toBe(200);

    // The soft-deleted row still holds the unique {shopId, userId} slot; it has
    // to be reused rather than blocking the user forever.
    const again = await request(getApp())
      .post(`${API}/shops/${shop._id}/reviews`)
      .set(auth(token))
      .send({ rating: 5, comment: 'Second attempt' });

    expect(again.status).toBe(201);
    expect(again.body.data.rating).toBe(5);

    const active = await Review.countDocuments({ shopId: shop._id, isActive: true });
    expect(active).toBe(1);

    const fresh = await Shop.findById(shop._id).select('ratings').lean();
    expect(fresh!.ratings.average).toBe(5);
    expect(fresh!.ratings.total).toBe(1);
  });

  it('keeps helpful.count in step with the voter list', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const author = await createUserAndSignIn('customer');
    const voter = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'helpful-shop' });

    const review = await request(getApp())
      .post(`${API}/shops/${shop._id}/reviews`)
      .set(auth(author.token))
      .send({ rating: 4 });

    const id = review.body.data.id as string;

    const on = await request(getApp()).post(`${API}/reviews/${id}/helpful`).set(auth(voter.token));
    expect(on.body.data).toEqual({ helpful: true, count: 1 });

    const off = await request(getApp()).post(`${API}/reviews/${id}/helpful`).set(auth(voter.token));
    expect(off.body.data).toEqual({ helpful: false, count: 0 });

    const stored = await Review.findById(id).select('+helpful.users').lean();
    expect(stored!.helpful.count).toBe(stored!.helpful.users.length);
  });
});

// ---------------------------------------------------------------------------
// Special/holiday hours were matched on the UTC date, so an override stored as
// local midnight resolved to the previous day in IST and was ignored.
// ---------------------------------------------------------------------------
describe('special hours timezone handling', () => {
  const alwaysOpen = {
    timezone: 'Asia/Kolkata',
    schedule: Object.fromEntries(
      ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((d) => [
        d,
        { open: '00:00', close: '23:59', isOpen: true },
      ]),
    ),
  };

  it('honours a holiday stored as IST midnight', () => {
    // 2026-01-26 00:00 IST is 2026-01-25T18:30Z — the UTC date is the 25th.
    const holiday = new Date('2026-01-25T18:30:00Z');
    const duringHoliday = new Date('2026-01-26T06:00:00Z'); // 11:30 IST on the 26th

    const state = getOpenState(
      { ...alwaysOpen, specialHours: [{ date: holiday, isOpen: false, reason: 'Republic Day' }] },
      duringHoliday,
    );

    expect(state.isOpenNow).toBe(false);
    expect(state.reason).toBe('special_closed');
  });

  it('ignores a holiday on a different day', () => {
    const state = getOpenState(
      { ...alwaysOpen, specialHours: [{ date: new Date('2026-01-25T18:30:00Z'), isOpen: false }] },
      new Date('2026-02-02T06:00:00Z'),
    );

    expect(state.isOpenNow).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Saved shops: the counter used to drift when the same shop was toggled twice.
// ---------------------------------------------------------------------------
describe('saved shops', () => {
  it('never drives saveCount below zero', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { token } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'save-count-shop' });

    await request(getApp()).post(`${API}/me/saved-shops/${shop._id}`).set(auth(token));
    await request(getApp()).post(`${API}/me/saved-shops/${shop._id}`).set(auth(token));

    const fresh = await Shop.findById(shop._id).select('analytics.saveCount').lean();
    expect(fresh!.analytics.saveCount).toBe(0);
  });

  it('does not save the same shop twice', async () => {
    const { user: owner } = await createUser({ role: 'owner' });
    const { user, token } = await createUserAndSignIn('customer');
    const shop = await seedShop(String(owner._id), { slug: 'dedupe-save-shop' });

    const first = await request(getApp()).post(`${API}/me/saved-shops/${shop._id}`).set(auth(token));
    expect(first.body.data.saved).toBe(true);

    const stored = await User.findById(user._id).select('savedShops').lean();
    expect(stored!.savedShops).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Image deletion moved from a path segment to a query parameter, because an
// encoded %2F does not survive every reverse proxy.
// ---------------------------------------------------------------------------
describe('image deletion contract', () => {
  it('requires a url query parameter', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'missing-url-shop' });

    const res = await request(getApp()).delete(`${API}/shops/${shop._id}/images`).set(auth(token));
    expect(res.status).toBe(422);
  });

  it('does not 500 on a malformed percent escape', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'bad-escape-shop' });

    const res = await request(getApp())
      .delete(`${API}/shops/${shop._id}/images`)
      .query({ url: '/static/uploads/100%.png' })
      .set(auth(token));

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// A rejected CORS origin surfaced as an opaque 500.
// ---------------------------------------------------------------------------
describe('CORS rejection', () => {
  it('answers 403 rather than 500 for a disallowed origin', async () => {
    const res = await request(getApp())
      .get(`${API}/health`)
      .set('Origin', 'https://attacker.example.com');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

// ---------------------------------------------------------------------------
// Latitude 0 is a valid coordinate; a truthiness check skipped re-verification.
// ---------------------------------------------------------------------------
describe('shop update re-verification', () => {
  it('reopens verification when latitude changes to 0', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'equator-shop', verification: 'verified' });

    const res = await request(getApp())
      .put(`${API}/shops/${shop._id}`)
      .set(auth(token))
      .send({ lat: 0, lng: 0 });

    expect(res.status).toBe(200);

    const fresh = await Shop.findById(shop._id).select('verification location').lean();
    expect(fresh!.location.coordinates).toEqual([0, 0]);
    expect(fresh!.verification.status).toBe('under_review');
  });
});

// ---------------------------------------------------------------------------
// The rate limiter sits in front of every route, so a cache outage must not
// turn into a total outage.
// ---------------------------------------------------------------------------
describe('rate limiter resilience', () => {
  it('allows requests through when the counter backend fails', async () => {
    const { cache } = await import('../src/utils/cache');
    const spy = jest.spyOn(cache, 'incr').mockRejectedValue(new Error('redis is down'));

    try {
      const res = await request(getApp()).get(`${API}/health`);
      expect(res.status).toBe(200);
    } finally {
      spy.mockRestore();
    }
  });
});
