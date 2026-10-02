import type { Request, Response } from 'express';
import { isProd } from '../config/env';
import { clearCsrfCookie, setCsrfCookie } from '../middleware/csrf';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok } from '../utils/response';
import { refreshTtlSeconds } from '../utils/token';
import * as authService from '../services/auth.service';
import { User } from '../models/User';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: refreshTtlSeconds() * 1000,
    path: REFRESH_COOKIE_PATH,
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  setRefreshCookie(res, result.tokens.refreshToken);
  setCsrfCookie(res);
  return created(res, result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  setRefreshCookie(res, result.tokens.refreshToken);
  setCsrfCookie(res);
  return ok(res, result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = (req.body?.refreshToken as string | undefined) ?? req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No refresh token provided');

  const tokens = await authService.refresh(token);
  setRefreshCookie(res, tokens.refreshToken);
  setCsrfCookie(res);
  return ok(res, { tokens });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = (req.body?.refreshToken as string | undefined) ?? req.cookies?.[REFRESH_COOKIE];
  await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  clearCsrfCookie(res);
  return ok(res, { message: 'Signed out' });
});

export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.sendPhoneOtp(req.body.phone, req.body.purpose);
  return ok(res, { message: 'If the number is valid, an OTP has been sent', ...result });
});

export const verifyPhone = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.confirmPhoneOtp(req.body.phone, req.body.code, req.body.purpose);
  return ok(res, result);
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body.identifier);
  return ok(res, { message: 'If an account exists, reset instructions have been sent', ...result });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  return ok(res, { message: 'Password updated. Please sign in.' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const tokens = await authService.changePassword(
    req.user!.id,
    req.body.currentPassword,
    req.body.newPassword,
  );

  // Every other session is now signed out; refresh this one's credentials.
  setRefreshCookie(res, tokens.refreshToken);
  setCsrfCookie(res);
  return ok(res, { message: 'Password changed successfully. Other devices have been signed out.', tokens });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select('-searchHistory');
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, user.toJSON());
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, avatar, bio, dateOfBirth, gender, preferences } = req.body;

  // Explicit field mapping — a raw $set of req.body would allow role escalation.
  const update: Record<string, unknown> = {};
  if (firstName !== undefined) update['profile.firstName'] = firstName;
  if (lastName !== undefined) update['profile.lastName'] = lastName;
  if (bio !== undefined) update['profile.bio'] = bio;
  if (avatar !== undefined) update['profile.avatar'] = avatar;
  if (dateOfBirth !== undefined) update['profile.dateOfBirth'] = dateOfBirth;
  if (gender !== undefined) update['profile.gender'] = gender;
  if (preferences?.searchRadius !== undefined) update['preferences.searchRadius'] = preferences.searchRadius;
  if (preferences?.notifications) {
    // Whitelist notification keys — user-controlled keys must never be
    // interpolated into MongoDB dot-notation paths (nested-key injection, A01).
    const ALLOWED_NOTIFICATION_KEYS = ['push', 'email', 'sms', 'priceDrop', 'newOffers'] as const;
    for (const key of ALLOWED_NOTIFICATION_KEYS) {
      if (key in preferences.notifications) {
        update[`preferences.notifications.${key}`] = preferences.notifications[key];
      }
    }
  }

  const user = await User.findByIdAndUpdate(req.user!.id, { $set: update }, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, user.toJSON());
});

export const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, address, city, state, pincode } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user!.id,
    {
      $set: {
        location: {
          type: 'Point',
          coordinates: [lng, lat],
          address,
          city,
          state,
          pincode,
        },
      },
    },
    { new: true, runValidators: true },
  );

  if (!user) throw ApiError.notFound('User not found');
  return ok(res, user.toJSON());
});
