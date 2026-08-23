/**
 * env-validate.ts
 *
 * Запускается один раз при инициализации сервера.
 * Падает с внятным сообщением если обнаружены небезопасные
 * значения по умолчанию или отсутствуют обязательные переменные.
 *
 * Вызывать из route.ts или instrumentation.ts:
 *   import '@/lib/env-validate';
 */

const DANGEROUS_DEFAULTS = [
  'super_secret_jwt_key_ems_platform_production_change_me_32chars',
  'change_me',
  'changeme',
  'secret',
  'jwt_secret',
];

function assertEnv(name: string, value: string | undefined, rules: {
  required?: boolean;
  minLength?: number;
  forbiddenValues?: string[];
}): void {
  const { required = true, minLength, forbiddenValues } = rules;

  if (required && !value) {
    throw new Error(
      `[env-validate] FATAL: Переменная окружения "${name}" не задана. ` +
      `Приложение не может запуститься без неё.`
    );
  }

  if (!value) return;

  if (minLength && value.length < minLength) {
    throw new Error(
      `[env-validate] FATAL: "${name}" слишком короткий (${value.length} символов). ` +
      `Минимум: ${minLength}. Сгенерируйте: openssl rand -hex 32`
    );
  }

  if (forbiddenValues) {
    const lower = value.toLowerCase();
    for (const forbidden of forbiddenValues) {
      if (lower.includes(forbidden.toLowerCase())) {
        throw new Error(
          `[env-validate] FATAL: "${name}" содержит небезопасное значение по умолчанию. ` +
          `Замените его перед деплоем в продакшен. ` +
          `Сгенерируйте: openssl rand -hex 32`
        );
      }
    }
  }
}

/**
 * Validates all required environment variables.
 * Throws on the first violation so the process crashes immediately with a clear message.
 * Safe to call multiple times — validation only runs in production or when explicitly forced.
 */
export function validateEnv(force = false): void {
  // Do not fail during static page generation / build step
  if ((process.env.NEXT_PHASE === 'phase-production-build' || process.env.npm_lifecycle_event === 'build') && !force) {
    return;
  }

  // Only enforce in production runtime unless forced (e.g., from tests)
  if (process.env.NODE_ENV !== 'production' && !force) {
    return;
  }

  assertEnv('JWT_SECRET', process.env.JWT_SECRET, {
    required: true,
    minLength: 32,
    forbiddenValues: DANGEROUS_DEFAULTS,
  });

  assertEnv('DATABASE_URL', process.env.DATABASE_URL, {
    required: true,
    minLength: 20,
  });

  // LDAP password — only required if LDAP is enabled
  if (process.env.LDAP_ENABLED === 'true') {
    assertEnv('LDAP_BIND_PASSWORD', process.env.LDAP_BIND_PASSWORD, {
      required: true,
      forbiddenValues: ['adminpassword', 'password', 'changeme'],
    });
    assertEnv('LDAP_ADMIN_PASSWORD', process.env.LDAP_ADMIN_PASSWORD, {
      required: false,
      forbiddenValues: ['adminpassword', 'password', 'changeme'],
    });
  }
}

// Auto-run on import in production
validateEnv();
