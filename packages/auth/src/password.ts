import * as crypto from 'crypto';

const DEFAULT_ITERATIONS = 210_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export function hashPassword(password: string, iterations = DEFAULT_ITERATIONS): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST).toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash) return false;

    // Новый формат: pbkdf2$iterations$salt$hash
    if (storedHash.startsWith('pbkdf2$')) {
      const parts = storedHash.split('$');
      if (parts.length !== 4) return false;
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const originalHash = parts[3];
      if (isNaN(iterations) || !salt || !originalHash) return false;

      const hash = crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
    }

    // Легаси формат: salt:hash (1000 или 210000 итераций)
    const parts = storedHash.split(':');
    if (parts.length === 2) {
      const [salt, originalHash] = parts;
      if (!salt || !originalHash) return false;

      // Пробуем сначала с 210,000, затем fallback на 1,000
      let hash = crypto.pbkdf2Sync(password, salt, DEFAULT_ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
      if (hash.length === originalHash.length && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash))) {
        return true;
      }

      hash = crypto.pbkdf2Sync(password, salt, 1000, KEY_LENGTH, DIGEST).toString('hex');
      if (hash.length === originalHash.length && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash))) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
