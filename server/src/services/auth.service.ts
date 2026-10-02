import crypto from 'crypto';
import { env, isDev } from '../config/env';
import { logger } from '../config/logger';
import { User, type IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { cache } from '../utils/cache';
import { issueOtp, verifyOtp } from '../utils/otp';
import {
  refreshTtlSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  isStaleAfterPasswordChange,
  passwordEpoch,
} from '../utils/token';
import type { LoginInput, RegisterInput } from '../validators/auth.validator';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResult {
  user: Record<string, unknown>;
  tokens: AuthTokens;
}

const blacklistKey = (jti: string) => `refresh:blacklist:${jti}`;
const resetKey = (token: string) => `pwreset:${crypto.createHash('sha256').update(token).digest('hex')}`;

function issueTokens(user: IUser): AuthTokens {
  const accessToken = signAccessToken({
    id: String(user._id),
    role: user.role,
    email: user.email,
    passwordChangedAt: user.passwordChangedAt,
  });
  const { token: refreshToken } = signRefreshToken(String(user._id), passwordEpoch(user));
  return { accessToken, refreshToken, expiresIn: env.JWT_ACCESS_TTL };
}

export async function register(input: RegisterInput): Promise<AuthResult & { otp?: { devCode?: string } }> {
  const existing = await User.findOne({ $or: [{ email: input.email }, { phone: input.phone }] })
    .select('_id email phone')
    .lean();

  if (existing) {
    throw ApiError.conflict(
      existing.email === input.email ? 'An account with this email already exists' : 'This phone number is already registered',
    );
  }

  const user = await User.create({
    email: input.email,
    phone: input.phone,
    passwordHash: input.password, // hashed by the pre-save hook
    role: input.role,
    profile: { firstName: input.firstName, lastName: input.lastName },
  });

  const otp = await issueOtp('verify_phone', input.phone);

  logger.info('User registered', { userId: String(user._id), role: user.role });

  return { user: user.toJSON(), tokens: issueTokens(user), otp: isDev ? { devCode: otp.devCode } : undefined };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const identifier = input.identifier.trim().toLowerCase();
  const query = /^[6-9]\d{9}$/.test(identifier) ? { phone: identifier } : { email: identifier };

  const user = await User.findOne(query).select('+passwordHash');

  // Same generic message either way — no user enumeration (OWASP A07).
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated. Contact support.');

  const matches = await user.comparePassword(input.password);
  if (!matches) throw ApiError.unauthorized('Invalid credentials');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return { user: user.toJSON(), tokens: issueTokens(user) };
}

export async function refresh(token: string): Promise<AuthTokens> {
  const payload = verifyRefreshToken(token);

  const revoked = await cache.get<boolean>(blacklistKey(payload.jti));
  if (revoked) throw ApiError.unauthorized('Session has been revoked, please sign in again');

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is unavailable');

  // A password change signs every older session out, including this one.
  if (isStaleAfterPasswordChange(payload.pwc, user.passwordChangedAt)) {
    throw ApiError.unauthorized('Password was changed, please sign in again');
  }

  // Rotate: the presented refresh token can never be used again.
  await cache.set(blacklistKey(payload.jti), true, refreshTtlSeconds());

  return issueTokens(user);
}

export async function logout(token?: string): Promise<void> {
  if (!token) return;
  try {
    const payload = verifyRefreshToken(token);
    await cache.set(blacklistKey(payload.jti), true, refreshTtlSeconds());
  } catch {
    // Already invalid — nothing to revoke.
  }
}

export async function sendPhoneOtp(phone: string, purpose: 'verify_phone' | 'reset_password') {
  const exists = await User.exists({ phone });
  if (purpose === 'reset_password' && !exists) {
    // Do not reveal whether the number is registered.
    return { expiresIn: env.OTP_TTL_SECONDS };
  }
  return issueOtp(purpose, phone);
}

export async function confirmPhoneOtp(phone: string, code: string, purpose: 'verify_phone' | 'reset_password') {
  await verifyOtp(purpose, phone, code);

  if (purpose === 'verify_phone') {
    await User.updateOne({ phone }, { $set: { isPhoneVerified: true, isVerified: true } });
    return { verified: true as const };
  }

  // Password reset: hand back a short-lived single-use token.
  const user = await User.findOne({ phone }).select('_id').lean();
  if (!user) throw ApiError.badRequest('Unable to process this request');

  const resetToken = crypto.randomBytes(32).toString('hex');
  await cache.set(resetKey(resetToken), String(user._id), 900); // 15 minutes
  return { verified: true as const, resetToken };
}

export async function forgotPassword(identifier: string): Promise<{ resetToken?: string }> {
  const value = identifier.trim().toLowerCase();
  const query = /^[6-9]\d{9}$/.test(value) ? { phone: value } : { email: value };
  const user = await User.findOne(query).select('_id email').lean();

  // Always respond identically to avoid account enumeration.
  if (!user) return {};

  const resetToken = crypto.randomBytes(32).toString('hex');
  await cache.set(resetKey(resetToken), String(user._id), 900);

  logger.info('Password reset requested', { userId: String(user._id) });
  // In production this link is emailed via SendGrid/SES instead of returned.
  return isDev ? { resetToken } : {};
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = await cache.get<string>(resetKey(token));
  if (!userId) throw ApiError.badRequest('This reset link is invalid or has expired');

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');

  user.passwordHash = newPassword;
  // The pre-save hook stamps passwordChangedAt, which invalidates every token
  // issued before now — including any session the attacker still holds.
  await user.save();
  await cache.del(resetKey(token));

  logger.info('Password reset completed', { userId });
}

/**
 * Changes the password and returns a fresh token pair.
 *
 * The password change invalidates every previously issued token, so the caller
 * needs new ones or it would log itself out along with the other sessions.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthTokens> {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  const matches = await user.comparePassword(currentPassword);
  if (!matches) throw ApiError.unauthorized('Current password is incorrect');

  user.passwordHash = newPassword;
  await user.save();

  logger.info('Password changed', { userId });

  return issueTokens(user);
}
