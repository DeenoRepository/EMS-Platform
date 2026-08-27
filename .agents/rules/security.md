# Правила безопасности и авторизации — EMS-Platform

> Обновлено: 2026-08-27 (по результатам security-аудита)  
> Уязвимости: [`docs/CODE_REVIEW_AUDIT.md`](../../docs/CODE_REVIEW_AUDIT.md)

---

## 1. Авторизация webhook-эндпоинтов (КРИТИЧНО)

При наличии настроенного `webhookSecret` запрос **без токена** должен быть отклонён с `401`.

### ❌ УЯЗВИМЫЙ паттерн (auth bypass):
```typescript
// Если providedToken === undefined/null — условие не срабатывает, запрос проходит!
if (providedToken && providedToken !== webhookSecret) {
  return NextResponse.json({ error: 'Неверный токен' }, { status: 401 });
}
```

### ✅ ПРАВИЛЬНЫЙ паттерн:
```typescript
// Строго: при наличии webhookSecret токен ОБЯЗАТЕЛЕН
if (!providedToken || providedToken !== webhookSecret) {
  return NextResponse.json(
    { success: false, error: 'Неверный или отсутствующий секретный токен вебхука' },
    { status: 401 }
  );
}
```

**Правило**: используй `!provided || provided !== secret`, а не `provided && provided !== secret`.

---

## 2. Rate Limiting — Обязательные эндпоинты

Использовать `enforceRateLimit()` из `@/lib/rate-limit` на ВСЕХ следующих маршрутах:

| Маршрут | Лимит | Окно |
|---|---|---|
| `POST /api/auth/login` | 10 запросов | 60 сек |
| `POST /api/setup/execute` | 3 запроса | 10 мин |
| `POST /api/setup/test-db` | 10 запросов | 60 сек |
| `POST /api/setup/test-ldap` | 10 запросов | 60 сек |
| `POST /api/eps/import/execute` | 5 запросов | 60 сек |
| `POST /api/eps/reports/generate` | 15 запросов | 60 сек |

```typescript
// Шаблон применения в любом API-роуте:
const rateLimitError = await enforceRateLimit(req, { limit: 10, windowMs: 60 * 1000, prefix: 'endpoint-name' });
if (rateLimitError) return rateLimitError;
```

**Внимание**: текущий `InMemoryRateLimitStore` работает только для единственного инстанса. При горизонтальном масштабировании — переключить на `RedisRateLimitStore`.

---

## 3. RBAC — Проверка разрешений в API-роутах

**Каждый** защищённый API-роут обязан использовать `requireAuth()` или явную проверку `hasPermission()`.

### Паттерн requireAuth (рекомендуемый для большинства роутов):
```typescript
import { requireAuth } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, PERMISSIONS.EPS_EQUIPMENT_VIEW);
  if (auth.errorResponse) return auth.errorResponse;
  const { user } = auth;
  // ... дальнейшая логика
}
```

### Паттерн getCurrentUser (только когда нужна гибкая логика):
```typescript
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { hasPermission } from '@ems/auth';

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();
  if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) return forbiddenResponse();
  // ...
}
```

### ❌ ЗАПРЕЩЕНО — получение пользователя без проверки прав:
```typescript
// Недостаточно! Нет проверки разрешений:
const user = await getCurrentUser(req);
if (!user) return unauthorizedResponse();
// ← здесь должна быть проверка hasPermission()
```

---

## 4. LDAP — Защита от Injection

**Всегда** использовать `escapeLdapFilter()` перед подстановкой пользовательского ввода в LDAP-фильтр.

```typescript
import { escapeLdapFilter } from '@ems/auth';

// ✅ Правильно
const sanitizedUsername = escapeLdapFilter(username);
const filter = filterTemplate.replace(/\{\{username\}\}/g, sanitizedUsername);

// ❌ НЕЛЬЗЯ — прямая подстановка
const filter = `(sAMAccountName=${username})`; // SQL/LDAP-инъекция!
```

Функция экранирует: `*`, `(`, `)`, `\`, `\x00`, `/` согласно RFC 4515.

---

## 5. Хранение паролей

Использовать только `hashPassword()` / `verifyPassword()` из `packages/auth/src/password.ts`.

- Алгоритм: **PBKDF2-SHA512**, 100 000 итераций, криптографическая соль
- ❌ Никогда не хранить пароли в открытом виде или в MD5/SHA1
- ❌ Никогда не логировать пароли в консоль (`console.log`, `console.error`)

---

## 6. JWT — Конфигурация

- Секрет хранится в `JWT_SECRET` (env), минимум 32 символа
- При отсутствии переменной — приложение падает с `FATAL: JWT_SECRET is not set`
- Использовать только библиотеку `jose` (HS256), не самописный JWT
- Время жизни токена: `JWT_EXPIRES_IN` / `JWT_EXPIRATION` (по умолчанию `8h`)

---

## 7. Защита от Directory Traversal (загрузка файлов)

При обслуживании файлов через `/api/files/[...path]` **обязательно** резолвить и сверять путь:

```typescript
const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
const resolvedFullPath = path.resolve(fullPath);
if (!resolvedFullPath.startsWith(uploadRoot)) {
  return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
}
```

---

## 8. Защита от SSRF (Setup-эндпоинты)

Эндпоинты `/api/setup/*` после установки (`fileInstalled === true`) должны требовать авторизацию администратора:

```typescript
if (fileInstalled) {
  const user = await getCurrentUser(req);
  if (!user || !user.roles.includes('admin')) {
    return NextResponse.json({ error: 'Доступ только для администратора' }, { status: 403 });
  }
}
```

---

## 9. Database — Запрет raw SQL

- Все запросы только через **Prisma типизированный ORM**
- `$queryRaw` разрешён **только** с template literals для health-check (`SELECT 1`)
- Параметры пользователя — только через Prisma-параметры, не конкатенацию строк

```typescript
// ✅ Допустимо (template literal, нет пользовательских данных)
await prisma.$queryRaw`SELECT 1 as healthy`;

// ❌ ЗАПРЕЩЕНО (потенциальная инъекция)
await prisma.$queryRaw(`SELECT * FROM users WHERE login = '${userInput}'`);
```

---

## 10. CSRF Protection

Функция `requireAuth()` автоматически проверяет `origin` vs `host` для мутирующих методов (`POST`, `PUT`, `DELETE`, `PATCH`).  
Дополнительно: **не** принимать мутирующие запросы без `Content-Type: application/json` там, где ожидается JSON-тело.
