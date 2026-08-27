# EMS-Platform — Отчёт о инспекции кода

> **Дата аудита:** 2026-08-27  
> **Инструмент:** `code_quality_checker.py` (TypeScript/TSX) + ручной анализ  
> **Покрытие:** `apps/web/src` — 206 файлов  
> **Итоговая оценка:** **C (72.8 / 100)**  
> **Вердикт:** ⚠️ **Request Changes** — требуется устранение критических и высоких нарушений перед слиянием в `main`

---

## Сводка результатов

| Метрика | Значение |
|---|---|
| Проанализировано файлов | 206 |
| Средний балл качества | 72.8 / 100 |
| Общая оценка | **C** |
| Файлов с оценкой F (0–49) | 7+ |
| Итого замечаний (code smells) | **2 381** |
| Нарушений SOLID | **28** |

### Распределение оценок

| Оценка | Файлов | Порог |
|---|---|---|
| F (0–49) | ~7 | Обязательный рефакторинг |
| C–D (50–74) | ~40 | Требует улучшений |
| B (75–89) | ~120 | Приемлемо |
| A (90+) | ~39 | Отлично |

---

## 🔴 КРИТИЧЕСКИЕ НАРУШЕНИЯ (требуют исправления)

### 1. Хардкод hex-цветов в `sx={}` пропах — массовое нарушение AGENTS.md п.2

**Правило:** запрещено использовать hex-цвета (`#0284c7`, `#94a3b8` и т.д.) в `sx={}` пропах MUI-компонентов.  
**Масштаб:** 300+ вхождений во всём проекте.

**Затронутые файлы (наиболее критичные):**
- [`apps/web/src/components/layout/Sidebar.tsx`](apps/web/src/components/layout/Sidebar.tsx) — 60+ hardcoded цветов (`#38bdf8`, `#94a3b8`, `#0f172a`, `#1e293b` и т.д.)
- [`apps/web/src/app/login/page.tsx`](apps/web/src/app/login/page.tsx) — 30+ (`#0284c7`, `#0b1120`, `#0f172a` и т.д.)
- [`apps/web/src/components/feedback/FeedbackDialog.tsx`](apps/web/src/components/feedback/FeedbackDialog.tsx) — 40+ hex-значений
- [`apps/web/src/app/admin/feedback/page.tsx`](apps/web/src/app/admin/feedback/page.tsx) — 50+ hex-значений
- [`apps/web/src/components/mro/MroExecutionWizardDialog.tsx`](apps/web/src/components/mro/MroExecutionWizardDialog.tsx) — 20+ (`#0f172a`, `#f8fafc`, `#e2e8f0`)
- [`apps/web/src/components/srm/SrmReliabilityAnalytics.tsx`](apps/web/src/components/srm/SrmReliabilityAnalytics.tsx) — палитра `PALETTE` из 7 hex-цветов

**Требуемое исправление:**
```typescript
// ❌ НЕПРАВИЛЬНО (текущий код)
<Typography color="#0f172a" />
<Box sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }} />

// ✅ ПРАВИЛЬНО
<Typography color="text.primary" />
<Box sx={{ bgcolor: 'grey.50', border: 1, borderColor: 'divider' }} />
```

---

### 2. Использование `<Chip>` для статусов сущностей — нарушение AGENTS.md п.2

**Правило:** для статусов сущностей запрещён `<Chip>` — только `<StatusBadge>`.  
**Масштаб:** найдено 104 использования `<Chip>` в TSX-файлах.

**Нарушения (использование `<Chip>` для отображения статусов/состояний):**

| Файл | Описание нарушения |
|---|---|
| [`apps/web/src/app/wms/page.tsx:117`](apps/web/src/app/wms/page.tsx:117) | `<Chip label={item.warehouseCode}>` — код склада как идентификатор состояния |
| [`apps/web/src/app/eps/page.tsx:860`](apps/web/src/app/eps/page.tsx:860) | `<Chip>` для тегов оборудования вместо тематического компонента |
| [`apps/web/src/app/mro/checklists/page.tsx:270`](apps/web/src/app/mro/checklists/page.tsx:270) | `<Chip label="Обязательно">` — статус обязательности |
| [`apps/web/src/components/ui/InfrastructureHealthBanner.tsx:149`](apps/web/src/components/ui/InfrastructureHealthBanner.tsx:149) | `<Chip label="Технические работы">` — системный статус |
| [`apps/web/src/components/ui/ModuleMaintenanceState.tsx:70`](apps/web/src/components/ui/ModuleMaintenanceState.tsx:70) | `<Chip label="Техническое обслуживание">` — статус модуля |
| [`apps/web/src/components/feedback/FeedbackDialog.tsx:505`](apps/web/src/components/feedback/FeedbackDialog.tsx:505) | `<Chip label={v.label} color={v.color}>` — статус |
| [`apps/web/src/app/srm/page.tsx:644`](apps/web/src/app/srm/page.tsx:644) | `<Chip label={issue.source}>` — источник инцидента |

**Допустимые использования `<Chip>` (не нарушение):** клавиатурные шорткаты (`Ctrl+K`, `ESC`, `↵`), артикулы товаров, единицы измерения, счётчики выбранных элементов.

---

### 3. Монструозные функции — нарушение порога 50 строк / сложность > 10

**Файлы с оценкой F, подлежащие обязательному рефакторингу:**

| Файл | Оценка | Строк | Функция | Строк в функции | Сложность |
|---|---|---|---|---|---|
| [`apps/web/src/app/eps/[id]/page.tsx`](apps/web/src/app/eps/%5Bid%5D/page.tsx) | **F** | 2 127 | `renderCustomFieldValue()` | **1 495** | **102** |
| [`apps/web/src/app/eps/page.tsx`](apps/web/src/app/eps/page.tsx) | **F** | 1 623 | `handleBulkPrint()` | **1 167** | **95** |
| [`apps/web/src/app/eps/approvals/page.tsx`](apps/web/src/app/eps/approvals/page.tsx) | **F** | 1 293 | `handleProcessReview()` | **923** | **74** |
| [`apps/web/src/app/setup/page.tsx`](apps/web/src/app/setup/page.tsx) | **F** | 1 505 | (весь файл) | — | — |
| [`apps/web/src/lib/jira-service.ts`](apps/web/src/lib/jira-service.ts) | **F** | 1 060 | `createInternalServiceRequest()` | **117** | **31** |
| [`apps/web/src/lib/jira-service.ts`](apps/web/src/lib/jira-service.ts) | **F** | 1 060 | `applyJiraFieldMapping()` | **101** | **40** |
| [`apps/web/src/lib/jira-service.ts`](apps/web/src/lib/jira-service.ts) | **F** | 1 060 | `syncJiraIssues()` | **162** | **22** |
| [`apps/web/src/app/eps/page.tsx`](apps/web/src/app/eps/page.tsx) | **F** | — | `handleRequestSort()` | **135** | **76** |
| [`apps/web/src/app/eps/[id]/page.tsx`](apps/web/src/app/eps/%5Bid%5D/page.tsx) | **F** | — | `handleDeleteDoc()` | **153** | **53** |

**Требуемое исправление:** декомпозиция в отдельные функции/хуки. Например:
- `renderCustomFieldValue()` → отдельный компонент `CustomFieldValue` в `components/eps/`
- `handleBulkPrint()` → хук `useBulkPrint()` + утилита `generatePrintDocument()`
- `syncJiraIssues()` → `fetchJiraIssues()` + `mapJiraIssuesToDb()` + `persistIssues()`

---

## 🟠 ВЫСОКИЕ НАРУШЕНИЯ

### 4. Отсутствие RBAC-проверки в `/api/users` — информационная утечка

**Файл:** [`apps/web/src/app/api/users/route.ts`](apps/web/src/app/api/users/route.ts:8)

```typescript
// ❌ ТЕКУЩИЙ КОД — только аутентификация, без авторизации
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();
  // Возвращает ВСЕХ пользователей (id, displayName, ldapLogin, email, roles)
  // любому аутентифицированному пользователю!
}
```

**Проблема:** любой залогиненный пользователь (в т.ч. `guest`) получает полный список пользователей с их `ldapLogin`, `email` и ролями — это раскрытие организационной структуры и потенциально чувствительных данных.

**Исправление:**
```typescript
// ✅ Добавить проверку минимального разрешения
if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW) && !user.roles.includes('admin')) {
  return forbiddenResponse();
}
```

---

### 5. Rate Limiting отсутствует на чувствительных эндпоинтах

**Правило AGENTS.md:** rate limiting обязателен на `/api/auth/*`, `/api/setup/*`, `/api/*/import/*`, `/api/*/reports/*`.

| Эндпоинт | Rate Limit | Статус |
|---|---|---|
| `POST /api/auth/login` | ✅ 10/мин | OK |
| `POST /api/setup/execute` | ✅ 3/10мин | OK |
| `POST /api/setup/test-db` | ✅ 10/мин | OK |
| `POST /api/setup/test-ldap` | ✅ 10/мин | OK |
| `POST /api/eps/reports/generate` | ✅ 15/мин | OK |
| `POST /api/eps/import/execute` | ✅ 5/мин | OK |
| `POST /api/auth/logout` | ❌ Отсутствует | **НАРУШЕНИЕ** |
| `GET /api/auth/me` | ❌ Отсутствует | низкий риск |
| `POST /api/admin/settings/test-ldap` | ❌ Отсутствует | **НАРУШЕНИЕ** |
| `POST /api/admin/settings/test-srm` | ❌ Отсутствует | **НАРУШЕНИЕ** |
| `POST /api/admin/settings/test-jira` | ❌ Отсутствует | средний риск |

**Исправление для `/api/admin/settings/test-ldap` и `/api/admin/settings/test-srm`:**
```typescript
const rateLimitError = await enforceRateLimit(req, { limit: 5, windowMs: 60 * 1000, prefix: 'admin-test' });
if (rateLimitError) return rateLimitError;
```

---

### 6. Магические числа в критичных бизнес-логиках

**Файл:** [`apps/web/src/lib/jira-service.ts`](apps/web/src/lib/jira-service.ts)

Обнаружены числовые константы без именования:
- `line 44` — `104` (максимальная длина поля?)
- `line 635` — `1000` (количество мс в секунде? лимит элементов?)
- `line 3600` — количество секунд в часе (должна быть константа `SECONDS_PER_HOUR`)
- `line 657, 1014, 1024` — `100` (процент? лимит?)

**Требуемое исправление:**
```typescript
// ❌ НЕПРАВИЛЬНО
const hours = ms / 1000 / 3600;

// ✅ ПРАВИЛЬНО
const MS_PER_SECOND = 1000;
const SECONDS_PER_HOUR = 3600;
const hours = ms / MS_PER_SECOND / SECONDS_PER_HOUR;
```

---

### 7. Нарушения SOLID — DIP (Dependency Inversion Principle)

Выявлены файлы с чрезмерным количеством прямых импортов:

| Файл | Кол-во импортов | Нарушение |
|---|---|---|
| [`apps/web/src/app/eps/[id]/page.tsx`](apps/web/src/app/eps/%5Bid%5D/page.tsx) | **33** | DIP — consider DI |
| [`apps/web/src/app/eps/page.tsx`](apps/web/src/app/eps/page.tsx) | **24** | DIP |
| [`apps/web/src/app/eps/approvals/page.tsx`](apps/web/src/app/eps/approvals/page.tsx) | **19** | DIP |

---

## 🟡 СРЕДНИЕ НАРУШЕНИЯ

### 8. OCP-нарушения в страницах approvals

**Файл:** [`apps/web/src/app/eps/approvals/page.tsx`](apps/web/src/app/eps/approvals/page.tsx:962)

```
Found 4 type checks — consider using polymorphism
```
Множественные `if (type === 'X')` вместо стратегий или маппинга — при добавлении нового типа придётся менять существующий код.

---

### 9. Файлы-гиганты (> 500 строк) — нарушение порога AGENTS.md

| Файл | Строк |
|---|---|
| [`apps/web/src/app/eps/[id]/page.tsx`](apps/web/src/app/eps/%5Bid%5D/page.tsx) | **2 127** |
| [`apps/web/src/app/eps/page.tsx`](apps/web/src/app/eps/page.tsx) | **1 623** |
| [`apps/web/src/app/eps/approvals/page.tsx`](apps/web/src/app/eps/approvals/page.tsx) | **1 293** |
| [`apps/web/src/app/setup/page.tsx`](apps/web/src/app/setup/page.tsx) | **1 505** |
| [`apps/web/src/lib/jira-service.ts`](apps/web/src/lib/jira-service.ts) | **1 060** |
| [`apps/web/src/components/layout/Sidebar.tsx`](apps/web/src/components/layout/Sidebar.tsx) | **1 300+** |
| [`apps/web/src/components/feedback/FeedbackDialog.tsx`](apps/web/src/components/feedback/FeedbackDialog.tsx) | **900+** |
| [`apps/web/src/components/wms/WmsOperationWizardDialog.tsx`](apps/web/src/components/wms/WmsOperationWizardDialog.tsx) | **1 400+** |

**Все эти файлы нарушают порог в 500 строк и подлежат разбивке на модули.**

---

## 🟢 СООТВЕТСТВИЯ СТАНДАРТАМ (положительные результаты)

### ✅ Безопасность webhook-эндпоинтов — ИСПРАВЛЕНО

Файл [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](apps/web/src/app/api/srm/webhooks/%5Bid%5D/route.ts:45) содержит корректную проверку webhook-секрета согласно правилу AGENTS.md:

```typescript
// ✅ ПРАВИЛЬНАЯ РЕАЛИЗАЦИЯ
if (!providedToken || providedToken !== webhookSecret) {
  return NextResponse.json({ error: 'Неверный или отсутствующий секретный токен' }, { status: 401 });
}
```

### ✅ LDAP-инъекции — защита реализована

**Файл:** [`packages/auth/src/ldap.ts`](packages/auth/src/ldap.ts:9) — функция `escapeLdapFilter()` определена и применяется во всех LDAP-запросах:

```typescript
export function escapeLdapFilter(input: string): string {
  return input.replace(/[\*\\()\x00\/]/g, (char) => { ... });
}
// Применяется в строках 95, 147, 213, 322
```

### ✅ RBAC на API-эндпоинтах — в целом соответствует

Все ключевые API-роуты используют `requireAuth(req, PERMISSIONS.*)` или паттерн `getCurrentUser() + hasPermission()`:
- EPS (equipment, approvals, documents, import, reports) — ✅
- WMS (warehouses, stock, transfers, operations, inventory) — ✅
- SRM (integrations, issues, sync, webhooks) — ✅
- MRO (schedules, plans, checklists) — ✅
- Admin (users, roles, permissions, settings, audit) — ✅

**Исключение:** [`/api/users`](apps/web/src/app/api/users/route.ts) — только аутентификация без авторизации (см. п.4).

### ✅ Rate Limiting на критичных эндпоинтах — реализован

`enforceRateLimit()` из [`@/lib/rate-limit`](apps/web/src/lib/rate-limit.ts) применяется на:
- `POST /api/auth/login` (10/мин)
- `POST /api/setup/execute` (3/10мин)
- `POST /api/eps/import/execute` (5/мин)
- `POST /api/eps/reports/generate` (15/мин)

### ✅ Shared UI-компоненты — используются

Компоненты `StatCard`, `StatusBadge`, `SearchInput`, `FilterToolbar`, `EmptyState`, `DataTableWrapper`, `ConfirmDialog` реализованы в [`apps/web/src/components/ui/`](apps/web/src/components/ui/) и активно используются.

### ✅ Отсутствие raw SQL / `$queryRaw`

Все запросы к БД через Prisma ORM. Raw SQL не обнаружен.

### ✅ Zod-валидация входных данных

В ключевых POST-эндпоинтах (`login`, `roles`, `approvals`) применяется Zod-схема для валидации тела запроса.

---

## 📋 План устранения нарушений

### Приоритет 1 — КРИТИЧЕСКИЙ (до следующего релиза)

| # | Задача | Файл(ы) | Трудозатраты |
|---|---|---|---|
| 1 | Декомпозировать `renderCustomFieldValue()` в компонент | [`eps/[id]/page.tsx`](apps/web/src/app/eps/%5Bid%5D/page.tsx) | 1 день |
| 2 | Декомпозировать `handleBulkPrint()` в хук/утилиту | [`eps/page.tsx`](apps/web/src/app/eps/page.tsx) | 1 день |
| 3 | Декомпозировать `handleProcessReview()` | [`eps/approvals/page.tsx`](apps/web/src/app/eps/approvals/page.tsx) | 0.5 дня |
| 4 | Декомпозировать `jira-service.ts` на модули | [`jira-service.ts`](apps/web/src/lib/jira-service.ts) | 1 день |
| 5 | Добавить RBAC-проверку в `/api/users` | [`users/route.ts`](apps/web/src/app/api/users/route.ts) | 30 мин |
| 6 | Добавить rate limiting на admin test-эндпоинты | [`test-ldap/route.ts`](apps/web/src/app/api/admin/settings/test-ldap/route.ts), [`test-srm/route.ts`](apps/web/src/app/api/admin/settings/test-srm/route.ts) | 1 час |

### Приоритет 2 — ВЫСОКИЙ (текущий спринт)

| # | Задача | Масштаб |
|---|---|---|
| 7 | Заменить hex-цвета в `Sidebar.tsx` на `theme.palette.*` | ~60 замен |
| 8 | Заменить hex-цвета в `login/page.tsx` | ~30 замен |
| 9 | Заменить hex-цвета в `FeedbackDialog.tsx` | ~40 замен |
| 10 | Заменить hex-цвета в `admin/feedback/page.tsx` | ~50 замен |
| 11 | Заменить `<Chip>` на `<StatusBadge>` для статусов сущностей | ~15 файлов |
| 12 | Вынести магические числа `jira-service.ts` в константы | — |

### Приоритет 3 — СРЕДНИЙ (следующий спринт)

| # | Задача |
|---|---|
| 13 | Разбить `setup/page.tsx` (1505 строк) на шаги-компоненты |
| 14 | Разбить `WmsOperationWizardDialog.tsx` (1400+ строк) на шаги |
| 15 | Разбить `FeedbackDialog.tsx` (900+ строк) |
| 16 | Разбить `Sidebar.tsx` (1300+ строк) на SidebarNav, SidebarUser и т.д. |
| 17 | Устранить OCP-нарушения в `approvals/page.tsx` |

---

## Сводная таблица соответствий правилам AGENTS.md

| Правило | Статус | Критичность |
|---|---|---|
| Webhook: `!providedToken \|\| providedToken !== webhookSecret` | ✅ Выполнено | Критический |
| LDAP: `escapeLdapFilter()` на всех входных данных | ✅ Выполнено | Критический |
| RBAC: `requireAuth` / `hasPermission` на всех роутах | ⚠️ Почти (кроме `/api/users`) | Высокий |
| Rate Limiting на `/api/auth/*`, `/api/setup/*` | ⚠️ Частично (нет на admin/test) | Высокий |
| Нет raw SQL / `$queryRaw` | ✅ Выполнено | Критический |
| Hex-цвета запрещены в `sx={}` | ❌ 300+ нарушений | Критический |
| `<StatusBadge>` вместо `<Chip>` для статусов | ❌ ~15 нарушений | Высокий |
| Длина функции ≤ 50 строк | ❌ 20+ нарушений | Высокий |
| Размер файла ≤ 500 строк | ❌ 8+ нарушений | Средний |
| Цикломатическая сложность ≤ 10 | ❌ Множественные нарушения | Высокий |
| Zod-валидация входных данных | ✅ Выполнено в ключевых роутах | Высокий |

---

## Артефакты аудита

- Полный JSON-отчёт качества кода: [`docs/quality_report.json`](docs/quality_report.json)
- Схема БД: [`docs/DATABASE_TOPOLOGY.md`](docs/DATABASE_TOPOLOGY.md)
- Технические спецификации: [`docs/specs/technical_specification.md`](docs/specs/technical_specification.md)

---

*Аудит выполнен автоматически агентом EMS-Platform Code Reviewer. Версия правил: 2.0 (AGENTS.md).*
