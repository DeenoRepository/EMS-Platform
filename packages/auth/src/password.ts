import * as crypto from 'crypto';

const DEFAULT_ITERATIONS = 210_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export function hashPassword(password: string, iterations = DEFAULT_ITERATIONS): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST).toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

const RU_TO_EN_KEYBOARD: Record<string, string> = {
  'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ъ': ']',
  'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l', 'ж': ';', 'э': "'",
  'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm', 'б': ',', 'ю': '.',
  'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I', 'Щ': 'O', 'З': 'P', 'Х': '{', 'Ъ': '}',
  'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K', 'Д': 'L', 'Ж': ':', 'Э': '"',
  'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B', 'Т': 'N', 'Ь': 'M', 'Б': '<', 'Ю': '>',
  'ё': '`', 'Ё': '~',
};

export function fixKeyboardLayout(input: string): string {
  if (!input) return input;
  return input.split('').map((ch) => RU_TO_EN_KEYBOARD[ch] || ch).join('');
}

function verifySingle(password: string, storedHash: string): boolean {
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

export function verifyPassword(password: string, storedHash: string): boolean {
  if (verifySingle(password, storedHash)) {
    return true;
  }
  // Если пароль содержит кириллические символы (случайно введен в русской раскладке)
  if (/[а-яёА-ЯЁ]/.test(password)) {
    const fixed = fixKeyboardLayout(password);
    if (verifySingle(fixed, storedHash)) {
      return true;
    }
  }
  return false;
}

