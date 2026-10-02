import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import type { UserRole } from '../models/User';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  type: 'access';
  /**
   * Password epoch: `passwordChangedAt` in ms, or 0 if never changed.
   *
   * Compared exactly against the stored value on every request, so a password
   * change invalidates every token minted before it. An `iat`-based comparison
   * cannot do this reliably — `iat` has second precision, so a token issued in
   * the same second as the change is indistinguishable from one issued before.
   */
  pwc: number;
  iat?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  /** Password epoch; see AccessTokenPayload.pwc. */
  pwc: number;
  iat?: number;
}

/** The password epoch carried in tokens issued for this user. */
export function passwordEpoch(user: { passwordChangedAt?: Date | null }): number {
  return user.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : 0;
}

export function signAccessToken(user: {
  id: string;
  role: UserRole;
  email: string;
  passwordChangedAt?: Date | null;
}): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    type: 'access',
    pwc: passwordEpoch(user),
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
    issuer: 'shopzy',
    audience: 'shopzy-client',
  } as SignOptions);
}

export function signRefreshToken(userId: string, pwc = 0): { token: string; jti: string } {
  const jti = randomUUID();
  const payload: RefreshTokenPayload = { sub: userId, jti, type: 'refresh', pwc };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
    issuer: 'shopzy',
    audience: 'shopzy-client',
  } as SignOptions);
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'shopzy',
    audience: 'shopzy-client',
  }) as AccessTokenPayload;
  if (decoded.type !== 'access') throw new jwt.JsonWebTokenError('Wrong token type');
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'shopzy',
    audience: 'shopzy-client',
  }) as RefreshTokenPayload;
  if (decoded.type !== 'refresh') throw new jwt.JsonWebTokenError('Wrong token type');
  return decoded;
}

/** Seconds until a refresh token expires — used as the blacklist TTL. */
export function refreshTtlSeconds(): number {
  const ttl = env.JWT_REFRESH_TTL;
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 7 * 24 * 3600;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 86400);
}

/**
 * True when a token predates the account's current password.
 *
 * Password resets must terminate sessions an attacker already holds, and a
 * stateless JWT cannot be revoked individually — so this is checked on use.
 * Tokens minted before this field existed carry no `pwc` claim; those are
 * treated as stale for any account that has since changed its password.
 */
export function isStaleAfterPasswordChange(
  tokenEpoch: number | undefined,
  passwordChangedAt: Date | undefined | null,
): boolean {
  const current = passwordChangedAt ? new Date(passwordChangedAt).getTime() : 0;
  return (tokenEpoch ?? 0) !== current;
}
