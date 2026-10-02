import request from 'supertest';
import { User } from '../src/models';
import { API, STRONG_PASSWORD, auth, clearCache, createUser, createUserAndSignIn, getApp, uniqueEmail, uniquePhone } from './helpers';

beforeEach(clearCache);

describe('POST /auth/register', () => {
  it('creates an account and returns tokens', async () => {
    const res = await request(getApp()).post(`${API}/auth/register`).send({
      email: 'new.user@example.com',
      phone: '9876500001',
      password: STRONG_PASSWORD,
      firstName: 'New',
      lastName: 'User',
      role: 'customer',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('new.user@example.com');
    expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));
    // The password hash must never leave the server.
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects a weak password with field-level detail', async () => {
    const res = await request(getApp()).post(`${API}/auth/register`).send({
      email: uniqueEmail(),
      phone: uniquePhone(),
      password: 'password',
      firstName: 'Weak',
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d: { path: string }) => d.path === 'password')).toBe(true);
  });

  it('rejects a duplicate email', async () => {
    const { email } = await createUser();

    const res = await request(getApp()).post(`${API}/auth/register`).send({
      email,
      phone: uniquePhone(),
      password: STRONG_PASSWORD,
      firstName: 'Dupe',
    });

    expect(res.status).toBe(409);
  });

  it('refuses to let a client self-assign the admin role', async () => {
    const res = await request(getApp()).post(`${API}/auth/register`).send({
      email: uniqueEmail(),
      phone: uniquePhone(),
      password: STRONG_PASSWORD,
      firstName: 'Sneaky',
      role: 'admin',
    });

    // `role` only accepts customer|owner, so admin fails validation outright.
    expect(res.status).toBe(422);
  });

  it('stores the password as a bcrypt hash, never in plain text', async () => {
    await request(getApp()).post(`${API}/auth/register`).send({
      email: 'hash.check@example.com',
      phone: '9876500002',
      password: STRONG_PASSWORD,
      firstName: 'Hash',
    });

    const stored = await User.findOne({ email: 'hash.check@example.com' }).select('+passwordHash').lean();
    expect(stored!.passwordHash).not.toBe(STRONG_PASSWORD);
    expect(stored!.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});

describe('POST /auth/login', () => {
  it('signs in with email', async () => {
    const { email } = await createUser();
    const res = await request(getApp()).post(`${API}/auth/login`).send({ identifier: email, password: STRONG_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.tokens.refreshToken).toEqual(expect.any(String));
  });

  it('signs in with phone number', async () => {
    const { phone } = await createUser();
    const res = await request(getApp()).post(`${API}/auth/login`).send({ identifier: phone, password: STRONG_PASSWORD });

    expect(res.status).toBe(200);
  });

  it('returns the same generic error for unknown user and wrong password', async () => {
    const { email } = await createUser();

    const wrongPassword = await request(getApp())
      .post(`${API}/auth/login`)
      .send({ identifier: email, password: 'Wrong@1234' });
    const unknownUser = await request(getApp())
      .post(`${API}/auth/login`)
      .send({ identifier: 'nobody@example.com', password: 'Wrong@1234' });

    // Identical responses prevent account enumeration.
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownUser.body.error.message);
  });

  it('blocks a deactivated account', async () => {
    const { user, email } = await createUser();
    await User.updateOne({ _id: user._id }, { $set: { isActive: false } });

    const res = await request(getApp()).post(`${API}/auth/login`).send({ identifier: email, password: STRONG_PASSWORD });
    expect(res.status).toBe(403);
  });

  it('rejects operator objects instead of treating them as a query', async () => {
    await createUser();

    const res = await request(getApp())
      .post(`${API}/auth/login`)
      .send({ identifier: { $ne: null }, password: { $ne: null } });

    expect(res.status).toBe(422);
  });
});

describe('token lifecycle', () => {
  it('rejects a request with no token', async () => {
    const res = await request(getApp()).get(`${API}/auth/me`);
    expect(res.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await request(getApp()).get(`${API}/auth/me`).set(auth('not-a-real-token'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns the current user for a valid token', async () => {
    const { token, email } = await createUserAndSignIn();
    const res = await request(getApp()).get(`${API}/auth/me`).set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email);
  });

  it('rotates the refresh token and revokes the old one', async () => {
    const { email } = await createUser();
    const login = await request(getApp()).post(`${API}/auth/login`).send({ identifier: email, password: STRONG_PASSWORD });
    const original = login.body.data.tokens.refreshToken;

    const first = await request(getApp()).post(`${API}/auth/refresh`).send({ refreshToken: original });
    expect(first.status).toBe(200);

    // Replaying the consumed refresh token must fail.
    const replay = await request(getApp()).post(`${API}/auth/refresh`).send({ refreshToken: original });
    expect(replay.status).toBe(401);
  });

  it('revokes the refresh token on logout', async () => {
    const { email } = await createUser();
    const login = await request(getApp()).post(`${API}/auth/login`).send({ identifier: email, password: STRONG_PASSWORD });
    const refreshToken = login.body.data.tokens.refreshToken;

    await request(getApp()).post(`${API}/auth/logout`).send({ refreshToken });

    const res = await request(getApp()).post(`${API}/auth/refresh`).send({ refreshToken });
    expect(res.status).toBe(401);
  });
});

describe('profile updates', () => {
  it('updates the profile but ignores privilege fields', async () => {
    const { token, user } = await createUserAndSignIn();

    const res = await request(getApp())
      .put(`${API}/auth/me`)
      .set(auth(token))
      .send({ firstName: 'Renamed', role: 'super_admin', isVerified: true });

    expect(res.status).toBe(200);
    expect(res.body.data.profile.firstName).toBe('Renamed');

    const fresh = await User.findById(user._id).lean();
    expect(fresh!.role).toBe('customer'); // escalation attempt had no effect
  });

  it('saves a geo location', async () => {
    const { token } = await createUserAndSignIn();

    const res = await request(getApp())
      .put(`${API}/auth/me/location`)
      .set(auth(token))
      .send({ lat: 23.2599, lng: 77.4126, city: 'Bhopal' });

    expect(res.status).toBe(200);
    expect(res.body.data.location.coordinates).toEqual([77.4126, 23.2599]);
  });

  it('changes the password and invalidates the old one', async () => {
    const { token, email } = await createUserAndSignIn();

    const res = await request(getApp())
      .post(`${API}/auth/change-password`)
      .set(auth(token))
      .send({ currentPassword: STRONG_PASSWORD, newPassword: 'Brand@New9' });

    expect(res.status).toBe(200);

    const oldLogin = await request(getApp()).post(`${API}/auth/login`).send({ identifier: email, password: STRONG_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(getApp()).post(`${API}/auth/login`).send({ identifier: email, password: 'Brand@New9' });
    expect(newLogin.status).toBe(200);
  });
});

describe('OTP phone verification', () => {
  it('issues an OTP and verifies the phone number', async () => {
    const { phone } = await createUser();

    const issue = await request(getApp()).post(`${API}/auth/otp/request`).send({ phone, purpose: 'verify_phone' });
    expect(issue.status).toBe(200);

    const code = issue.body.data.devCode as string;
    expect(code).toMatch(/^\d{6}$/);

    const verify = await request(getApp())
      .post(`${API}/auth/verify-phone`)
      .send({ phone, code, purpose: 'verify_phone' });

    expect(verify.status).toBe(200);
    const user = await User.findOne({ phone }).lean();
    expect(user!.isPhoneVerified).toBe(true);
  });

  it('rejects an incorrect code', async () => {
    const { phone } = await createUser();
    await request(getApp()).post(`${API}/auth/otp/request`).send({ phone, purpose: 'verify_phone' });

    const res = await request(getApp())
      .post(`${API}/auth/verify-phone`)
      .send({ phone, code: '000000', purpose: 'verify_phone' });

    expect(res.status).toBe(400);
  });
});
