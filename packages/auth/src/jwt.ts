import { SignJWT, jwtVerify } from 'jose';
import { JwtUserPayload } from '@ems/shared';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'ems-super-secret-jwt-key-change-in-production-min-32-chars-long';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export async function signSessionToken(payload: JwtUserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<JwtUserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtUserPayload;
  } catch (err) {
    return null;
  }
}
