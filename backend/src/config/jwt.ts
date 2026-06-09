import jwt from 'jsonwebtoken';
import { env } from './env.js';

export type AccessTokenPayload = {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
};

export type TempTokenPayload = {
  userId: string;
  purpose: 'mfa';
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'] });
}

export function signTempToken(payload: TempTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '5m' });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function verifyTempToken(token: string): TempTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TempTokenPayload;
}
