import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '../db/schema.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  businessId: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      businessId: payload.businessId,
    },
    env.JWT_SECRET,
    options,
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  if (
    typeof decoded.sub !== 'string' ||
    typeof decoded.email !== 'string' ||
    typeof decoded.role !== 'string' ||
    (decoded.businessId !== null && typeof decoded.businessId !== 'string')
  ) {
    throw new Error('Invalid token payload');
  }
  return {
    sub: decoded.sub,
    email: decoded.email,
    role: decoded.role as UserRole,
    businessId: decoded.businessId ?? null,
  };
}
