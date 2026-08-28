# EMS-Platform — Комплексная инспекция проекта

> **Дата инспекции:** 2026-08-28  
> **Инспектор:** AI Code Reviewer (code-reviewer skill)  
> **Охват:** `apps/web/src` (229 файлов), `packages/` (22 файла)  
> **Базовые правила:** AGENTS.md + `.agents/skills/code-reviewer/`

---

## 📊 Сводная оценка

| Область | Оценка | Статус |
|---------|--------|--------|
| **apps/web/src** — качество кода | **75.7 / 100 (C)** | ⚠️ Требует работы |
| **packages/** — качество кода | **91.2 / 100 (A)** | ✅ Отлично |
| **Безопасность — RBAC** | **~95%** покрытие маршрутов | ✅ Хорошо |
| **Безопасность — Rate Limiting** | **~30%** покрытие маршрутов | ❌ Критично |
| **Безопасность — Webhook** | Исправлено корректно | ✅ Хорошо |
| **UI — Shared компоненты** | Библиотека зрелая | ✅ Хорошо |
| **UI — Hardcoded цвета** | 1 изолированное нарушение | ✅ Норма |
| **TypeScript `any`** | >200 вхождений | ⚠️ Требует работы |

---

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. Отсутствие Rate Limiting на большинстве API-маршрутов

По данным AGENTS.md, `enforceRateLimit()` **обязателен** на всех чувствительных эндпоинтах. Из ~70 API-маршрутов только **17 имеют rate limiting**:

**Маршруты С rate limiting** (17 штук):
- `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- `/api/setup/execute`, `/api/setup/status`, `/api/setup/test-db`, `/api/setup/test-ldap`
- `/api/system/health`
- `/api/eps/import/execute`, `/api/eps/import/analyze`, `/api/eps/import/template`
- `/api/eps/reports/generate`, `/api/eps/reports/templates`, `/api/eps/reports/templates/[id]`
- `/api/admin/settings/test-ldap`, `/api/admin/settings/test-srm`
- `/api/srm/webhooks/[id]`

**Маршруты БЕЗ rate limiting** (критические пропуски):
```
/api/admin/users          — управление пользователями (ДОЛЖЕН иметь RL)
/api/admin/roles          — управление ролями
/api/admin/roles/[id]     — управление ролями
/api/admin/permissions    — управление правами
/api/admin/settings       — системные настройки
/api/admin/audit-log      — журнал аудита
/api/admin/database/dump  — дамп базы данных (!!)
/api/eps/equipment        — реестр оборудования
/api/eps/equipment/[id]   — операции с оборудованием
/api/eps/approvals        — согласования
/api/eps/documents        — документы
/api/wms/operations       — складские операции
/api/wms/transfers        — перемещения ТМЦ
/api/wms/warehouses       — управление складами
/api/wms/stock            — складской остаток
/api/wms/inventories      — инвентаризации
/api/srm/issues           — сервисные заявки
/api/srm/integrations     — управление интеграциями
/api/dashboard/stats      — статистика дашборда
/api/feedback             — обратная связь
/api/notifications        — уведомления
```

**Влияние:** MEDIUM-HIGH — без RL возможны DoS, brute-force, enumeration-атаки на данные.

---

### 2. Файлы с оценкой F (0–49/100) — обязательный рефакторинг по AGENTS.md

Согласно правилу AGENTS.md: _"Файлы с оценкой F (0-49/100) подлежат обязательному рефакторингу перед слиянием в main"_.

#### Критические F-файлы (страницы и компоненты):

| Файл | Проблема |
|------|---------|
| `apps/web/src/app/eps/page.tsx` (1455 строк) | `handleBulkPrint` — 1167 строк, сложность **95** (max 10) |
| `apps/web/src/app/eps/approvals/page.tsx` | Превышение лимитов функций |
| `apps/web/src/app/eps/[id]/page.tsx` | Превышение лимитов функций |
| `apps/web/src/app/setup/page.tsx` | Большой файл |
| `apps/web/src/app/wms/operations/page.tsx` | Превышение лимитов |
| `apps/web/src/components/eps/EquipmentWizardForm.tsx` | Нарушение пороговых значений |
| `apps/web/src/components/eps/SmartImportWizard.tsx` | Нарушение пороговых значений |
| `apps/web/src/components/layout/Sidebar.tsx` | Нарушение пороговых значений |
| `apps/web/src/app/wms/stock/page.tsx` | Нарушение пороговых значений |
| `apps/web/src/app/admin/settings/page.tsx` | Нарушение пороговых значений |
| `apps/web/src/app/admin/feedback/page.tsx` | Нарушение пороговых значений |
| `apps/web/src/app/wms/warehouses/page.tsx` | Нарушение пороговых значений |
| `apps/web/src/components/mro/MroExecutionWizardDialog.tsx` | Нарушение пороговых значений |
| `apps/web/src/components/feedback/FeedbackDialog.tsx` | Нарушение пороговых значений |
| `apps/web/src/components/wms/StockDetailDrawer.tsx` | Нарушение пороговых значений |
| `apps/web/src/components/wms/WmsOperationItemsStep.tsx` | Нарушение пороговых значений |
| `apps/web/src/components/wms/TransferRequestDialog.tsx` | Нарушение пороговых значений |
| `apps/web/src/components/wms/WarehouseTopologyModal.tsx` | Нарушение пороговых значений |
| `apps/web/src/components/wms/WmsOperationWizardDialog.tsx` | Нарушение пороговых значений |
| `apps/web/src/components/ui/DataTableWrapper.tsx` | Нарушение пороговых значений |
| `apps/web/src/theme/theme.ts` | Нарушение пороговых значений |

#### Критический API F-файл:
| Файл | Проблема |
|------|---------|
| `apps/web/src/app/api/eps/import/analyze/route.ts` | Функция на 329+ строк, complexity > 10 |

---

## 🟡 ВАЖНЫЕ ПРОБЛЕМЫ

### 3. Широкое использование `any` (TypeScript)

Обнаружено **>200 вхождений** `any` в production-коде (не тесты). Нарушает правило TypeScript-правил скилла code-reviewer и AGENTS.md.

Особенно критично в:
- `apps/web/src/lib/srm-providers/*.ts` — все адаптеры (`jira-adapter.ts`, `gitlab-adapter.ts`, `redmine-adapter.ts`, `generic-rest-adapter.ts`)
- `apps/web/src/lib/jira/field-mapping.ts` — функции `extractValueByPath`, `transformValue`, `applyJiraFieldMapping`
- `apps/web/src/lib/jira/sync.ts` — `integrationWhere: any`
- `apps/web/src/app/api/*/route.ts` — множественные `updateData: any`, `where: any`, `data: any`
- `apps/web/src/lib/jira/service-requests.ts` — возвращаемые типы `Promise<any>`

**Рекомендация:** Заменить `any` на конкретные типы или `unknown` с type-guard'ами.

### 4. Unbounded Prisma-запросы (N+1 и отсутствие лимитов)

Несколько маршрутов выполняют `findMany()` **без ограничения `take`/`limit`**:

```typescript
// apps/web/src/app/api/admin/users/route.ts
const users = await prisma.user.findMany({ include: { ... } }); // ← нет take

// apps/web/src/app/api/admin/roles/route.ts
const roles = await prisma.role.findMany({ include: { ... } }); // ← нет take

// apps/web/src/lib/database-backup-service.ts
prisma.equipment.findMany()    // ← ВСЯ таблица
prisma.stockItem.findMany()    // ← ВСЯ таблица
prisma.jiraIssueCache.findMany() // ← ВСЯ таблица
```

В `/api/srm/webhooks/[id]/route.ts` — `take: 1000` захардкожено:
```typescript
const allEquipment = await prisma.equipment.findMany({ take: 1000, ... });
```

### 5. Magic Numbers в UI-компонентах

Согласно code-reviewer, 1455-строчный `eps/page.tsx` содержит **15+ magic numbers** в пикселях (500, 600, 700, 140, 130, 160, 220 и т.д.) используемых как ширина колонок DataGrid — должны быть вынесены в именованные константы.

### 6. `console.error` в production-коде

```typescript
// apps/web/src/lib/jira/sync.ts:79
console.error(`Ошибка синхронизации интеграции [${integration.name}]:`, err);
```

Вместо `console.error` должен использоваться структурированный `logger` из `@/lib/logger`.

---

## 🟢 ХОРОШЕЕ

### Безопасность — RBAC ✅

**Все** API-маршруты (кроме публичных) корректно проверяют аутентификацию и права:
- Используются оба паттерна: `requireAuth(req, PERMISSIONS.*)` (MRO, SRM-маршруты) и `getCurrentUser` + `hasPermission` (EPS, WMS, Admin)
- Нет маршрутов с голым `getCurrentUser()` без последующей проверки прав
- Правильное разделение: `unauthorizedResponse()` (401) vs `forbiddenResponse()` (403)

### Безопасность — Webhook ✅

В [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](apps/web/src/app/api/srm/webhooks/[id]/route.ts) исправлена уязвимость (см. паттерн из AGENTS.md):
```typescript
// ✅ ПРАВИЛЬНО — отклонить при отсутствии ИЛИ несовпадении токена
if (!providedToken || providedToken !== webhookSecret) {
  return NextResponse.json({ error: '...' }, { status: 401 });
}
```
Также есть ограничение размера тела: `MAX_WEBHOOK_BODY_SIZE = 5MB`.

### Безопасность — LDAP Injection ✅

В `packages/auth/src/ldap.ts` используется `escapeLdapFilter()` перед подстановкой пользовательского ввода (согласно аудиту из `docs/CODE_REVIEW_AUDIT.md`).

### Безопасность — SSRF ✅

В `apps/web/src/lib/outbound-url.ts` и его применении в `test-ldap`, `test-srm` используется `validateOutboundUrl()` для защиты от SSRF.

### Безопасность — JWT ✅

`packages/auth/src/jwt.ts` — корректная реализация `signSessionToken` / `verifySessionToken` с проверкой подписи.

### UI — Shared компоненты ✅

Библиотека `@/components/ui` полностью укомплектована согласно требованиям AGENTS.md:
- `StatCard` — есть
- `StatusBadge` — есть (и **используется** вместо `<Chip>` для статусов — нарушений не найдено)
- `SearchInput` — есть
- `FilterToolbar` — есть
- `EmptyState` — есть
- `DataTableWrapper` — есть
- `ConfirmDialog` — есть

### UI — Hardcoded hex-цвета ✅

Найдено **только 1** нарушение и оно изолировано в print-CSS в [`apps/web/src/theme/ThemeRegistry.tsx`](apps/web/src/theme/ThemeRegistry.tsx:65) — допустимый контекст (media print).

### packages/ — Качество кода ✅

Пакеты `auth`, `database`, `shared` имеют оценку **A (91.2/100)**:
- `packages/auth/src/rbac.ts` — A, 64 строки, правильная структура
- `packages/auth/src/jwt.ts` — A, 36 строк
- `packages/auth/src/ldap.ts` — зрелый код
- `packages/auth/src/audit.ts` — структурированный аудит

Исключение: `packages/database/src/seed.ts` — F (968 строк), но это seed-файл, не production-код.

---

## 📋 ДЕТАЛЬНЫЙ ПЛАН УСТРАНЕНИЙ

### Приоритет 1 — СРОЧНО (блокируют merge в main по AGENTS.md)

| # | Действие | Файл(ы) | Усилие |
|---|---------|---------|--------|
| P1-1 | Добавить `enforceRateLimit` на `/api/admin/*` | 6 файлов admin routes | S |
| P1-2 | Добавить `enforceRateLimit` на `/api/eps/equipment`, `/api/eps/approvals`, `/api/eps/documents` | 3 файла | S |
| P1-3 | Добавить `enforceRateLimit` на `/api/wms/operations`, `/api/wms/transfers`, `/api/wms/warehouses`, `/api/wms/stock`, `/api/wms/inventories` | 5 файлов | S |
| P1-4 | Добавить `enforceRateLimit` на `/api/srm/issues`, `/api/srm/integrations` | 2 файла | S |
| P1-5 | Рефакторинг `handleBulkPrint` в `eps/page.tsx` — декомпозиция функции 1167 строк, сложность 95 | `apps/web/src/app/eps/page.tsx` | XL |
| P1-6 | Декомпозиция `eps/import/analyze/route.ts` (329+ строк в одной функции) | 1 файл | M |

### Приоритет 2 — ВЫСОКИЙ (оценка F, требуют рефакторинга)

| # | Действие | Файл(ы) | Усилие |
|---|---------|---------|--------|
| P2-1 | Разбить `SmartImportWizard.tsx` на шаги-подкомпоненты | 1 файл | M |
| P2-2 | Разбить `EquipmentWizardForm.tsx` на секции | 1 файл | M |
| P2-3 | Рефакторинг `Sidebar.tsx` — вынести навигационные секции в данные | 1 файл | S |
| P2-4 | Рефакторинг `MroExecutionWizardDialog.tsx` — декомпозиция шагов | 1 файл | M |
| P2-5 | Рефакторинг `WmsOperationWizardDialog.tsx` + `WmsOperationItemsStep.tsx` | 2 файла | M |
| P2-6 | Рефакторинг `TransferRequestDialog.tsx` | 1 файл | S |
| P2-7 | Разбить `DataTableWrapper.tsx` на хуки и субкомпоненты | 1 файл | M |

### Приоритет 3 — СРЕДНИЙ (TypeScript quality)

| # | Действие | Файл(ы) | Усилие |
|---|---------|---------|--------|
| P3-1 | Заменить `any` на типизированные интерфейсы в SRM-адаптерах | 4 файла srm-providers | M |
| P3-2 | Типизировать `jira/field-mapping.ts` — убрать `any` из публичных сигнатур | 1 файл | M |
| P3-3 | Добавить `take` лимиты к unbounded `findMany()` в admin-маршрутах | 3 файла | S |
| P3-4 | Заменить `console.error` на `logger.error` в `jira/sync.ts` | 1 файл | XS |
| P3-5 | Вынести magic numbers пикселей колонок DataGrid в константы | `eps/page.tsx` | S |

---

## 📈 Метрики инспекции

### apps/web/src
```
Файлов проанализировано:  229
Средний балл:             75.7
Общая оценка:             C
Файлов с оценкой F:       39
Файлов с оценкой D:       13
Файлов с оценкой C:       37
Файлов с оценкой B+/A:    ~140
Всего code smells:        2223
SOLID-нарушений:          28
```

### packages/
```
Файлов проанализировано:  22
Средний балл:             91.2
Общая оценка:             A
Файлов с оценкой F:       1 (seed.ts — исключение)
Всего code smells:        87
SOLID-нарушений:          0
```

### API-маршруты (security)
```
Всего маршрутов:          ~70
С RBAC-проверкой:         ~68 (97%)
С rate limiting:          17 (24%)
Webhook security:         ✅ исправлено
SSRF protection:          ✅ реализовано
LDAP injection guard:     ✅ реализовано
```

---

## ✅ Вердикт Code Review

| Категория | Вердикт |
|-----------|---------|
| Безопасность | **Approve with Changes** — RBAC хорошо, нужен RL |
| Код (packages/) | **Approve** |
| Код (apps/web/) | **Request Changes** — F-файлы блокируют merge |
| UI / Design System | **Approve** |

> **Итоговый вердикт: Request Changes**  
> Критические блокеры: отсутствие rate limiting на admin/data endpoints + 39 файлов с оценкой F.  
> После устранения P1 — переход в "Approve with suggestions".

---

*Отчёт сгенерирован автоматически на основе `code-reviewer` skill + ручной проверки кода.*
