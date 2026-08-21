import { SignJWT, jwtVerify } from 'jose';
import { JwtUserPayload } from '@ems/shared';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Критическая ошибка безопасности: Переменная окружения JWT_SECRET обязательна в production-режиме.');
    }
    return new TextEncoder().encode('ems-default-dev-secret-jwt-key-not-for-production-min-32-chars-long');
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: JwtUserPayload): Promise<string> {
  const jwtSecret = getJwtSecret();
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRATION || '8h';

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(jwtExpiresIn)
    .sign(jwtSecret);
}

export async function verifySessionToken(token: string): Promise<JwtUserPayload | null> {
  if (!token) return null;
  try {
    const jwtSecret = getJwtSecret();
    const { payload } = await jwtVerify(token, jwtSecret);
    return payload as unknown as JwtUserPayload;
  } catch {
    return null;
  }
}
