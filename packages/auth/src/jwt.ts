import { SignJWT, jwtVerify } from 'jose';
import { JwtUserPayload } from '@ems/shared';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('КРИТИЧЕСКАЯ ОШИБКА БЕЗОПАСНОСТИ: JWT_SECRET не задан в переменных окружения.');
    }
    console.warn('⚠️ ПРЕДУПРЕЖДЕНИЕ: Используется дефолтный JWT_SECRET для разработки. Задайте JWT_SECRET в .env для продакшена.');
    return new TextEncoder().encode('ems-dev-secret-jwt-key-not-for-production-min-32-chars-long');
  }
  if (secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('КРИТИЧЕСКАЯ ОШИБКА: JWT_SECRET должен содержать не менее 32 символов.');
    }
  }
  return new TextEncoder().encode(secret);
}

const JWT_SECRET = getJwtSecret();
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
