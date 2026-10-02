import { z } from 'zod';
import { email, imageRef, latitude, longitude, password, phone, pincode } from './common';

export const registerSchema = z.object({
  email,
  phone,
  password,
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).optional(),
  role: z.enum(['customer', 'owner']).default('customer'),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone number'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

export const requestOtpSchema = z.object({
  phone,
  purpose: z.enum(['verify_phone', 'reset_password']).default('verify_phone'),
});

export const verifyOtpSchema = z.object({
  phone,
  code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  purpose: z.enum(['verify_phone', 'reset_password']).default('verify_phone'),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(180).optional(),
  avatar: imageRef.optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  preferences: z
    .object({
      searchRadius: z.coerce.number().min(1).max(50).optional(),
      notifications: z
        .object({
          push: z.boolean().optional(),
          email: z.boolean().optional(),
          sms: z.boolean().optional(),
          priceDrop: z.boolean().optional(),
          newOffers: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const updateLocationSchema = z.object({
  lat: latitude,
  lng: longitude,
  address: z.string().max(300).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  pincode: pincode.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
