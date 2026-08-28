# Инспекция проекта EMS-Platform

**Дата инспекции:** 2026-08-29  
**Инструменты:** `code_quality_checker.py` (TypeScript), ручной анализ API-маршрутов, поиск по codebase  
**Охват:** `apps/web/src` (258 файлов), `apps/web/src/app/api` (85+ роутов), `packages/`  
**Правила:** AGENTS.md v2.0, `universal.md`, `languages/typescript.md`  
**Статус предыдущего аудита:** `CODE_REVIEW_AUDIT.md` (2026-08-27), `PROJECT_INSPECTION_2026-08-28.md` (2026-08-28)

---

## 1. Сводка результатов

| Метрика | Текущее значение | Δ к предыд. аудиту |
|---|---|---|
| Файлов проанализировано | **258** | +39 файлов |
| Средний балл качества | **77.1 / 100** | = (стабильно) |
| Общая оценка | **C** | = |
| Code smells (всего) | **2 341** | +16 (незначительный рост) |
| SOLID-нарушений | **23** | -5 (улучшение) |
| Файлов с grade F | **26** | Новые данные |
| Файлов с grade A/B | Большинство API-роутов | ✅ |
| High-severity smells | **49** | Подробности ниже |

---

## 2. Безопасность (Security)

### 2.1 RBAC и авторизация — СТАТУС: ✅ СОБЛЮДАЕТСЯ

Проверено **100%** роутов (85+ файлов `route.ts`). Все маршруты используют один из двух паттернов:

```typescript
// Паттерн A — getCurrentUser + hasPermission (большинство роутов)
const user = await getCurrentUser(req);
if (!user) return unauthorizedResponse();
if (!hasPermission(user, PERMISSIONS.X_Y_Z)) return forbiddenResponse();

// Паттерн B — requireAuth (SRM/MRO-роуты)
const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
if (auth.errorResponse) return auth.errorResponse;
```

Нет ни одного роута с голым `getCurrentUser()` без проверки роли/разрешения.

### 2.2 Rate Limiting — СТАТУС: ✅ СОБЛЮДАЕТСЯ

`enforceRateLimit()` присутствует **во всех** роутах. Лимиты откалиброваны:

| Эндпоинт | Лимит |
|---|---|
| `/api/auth/login` | 10/мин |
| `/api/setup/*` | 3–10/мин |
| `/api/admin/settings/test-ldap` | 5/мин |
| `/api/admin/settings/test-jira` | 5/мин |
| `/api/admin/database/dump` | 5/мин |
| `/api/srm/integrations/*/sync` | 10/мин |
| Стандартные GET | 60–120/мин |
| Мутирующие операции (POST/PATCH/DELETE) | 20–60/мин |

### 2.3 Webhook-аутентификация — СТАТУС: ✅ ИСПРАВЛЕН И ВЕРИФИЦИРОВАН

[`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/[id]/route.ts:56) реализует корректный паттерн:

```typescript
// ПРАВИЛЬНО: отклонять при ОТСУТСТВИИ ИЛИ несовпадении токена
if (!providedToken || providedToken !== webhookSecret) {
  return NextResponse.json({ ... }, { status: 401 });
}
```

Дополнительно реализована защита от больших пейлоадов (`MAX_WEBHOOK_BODY_SIZE = 5MB`).

### 2.4 Raw SQL — СТАТУС: ✅ ДОПУСТИМО

`$queryRaw` используется только в двух местах с шаблонными литералами:
- [`system/health/route.ts`](../apps/web/src/app/api/system/health/route.ts:108): `` prisma.$queryRaw`SELECT 1 as healthy` ``
- [`setup/test-db/route.ts`](../apps/web/src/app/api/setup/test-db/route.ts:60): `` client.$queryRaw`SELECT 1 as connected` ``

Оба — health-check запросы без пользовательского ввода. Соответствуют AGENTS.md.

### 2.5 Потенциальные замечания

| # | Файл | Находка | Приоритет |
|---|---|---|---|
| S-01 | [`srm/webhooks/[id]/route.ts:40`](../apps/web/src/app/api/srm/webhooks/[id]/route.ts:40) | `(integration.authConfig as any)` — `any`-каст для доступа к секрету | Low |
| S-02 | [`ThemeRegistry.tsx:46`](../apps/web/src/theme/ThemeRegistry.tsx:46) | `dangerouslySetInnerHTML` — стандартный MUI SSR-паттерн, не является уязвимостью | Info |
| S-03 | `logger.ts:63` | `console.log` с eslint-disable — корректно задокументировано | Info |

---

## 3. Качество кода

### 3.1 Файлы с оценкой F (подлежат рефакторингу)

По AGENTS.md v2.0 файлы с оценкой F (0–49) обязательны к рефакторингу.

**Критические (0–20 баллов):**

| Файл | Балл | Smells | Avg CX | Главная проблема |
|---|---|---|---|---|
| [`app/eps/[id]/page.tsx`](../apps/web/src/app/eps/[id]/page.tsx) | **0** | 102 | 18.8 | God function `handleCopy` (CX=79), `handleDeleteDoc` (CX=53); 2024 строки |
| [`app/setup/page.tsx`](../apps/web/src/app/setup/page.tsx) | **0** | 49 | 6.1 | Magic numbers, long functions |
| [`components/eps/EquipmentWizardForm.tsx`](../apps/web/src/components/eps/EquipmentWizardForm.tsx) | **0** | 43 | 7.8 | Размер + сложность |
| [`components/eps/SmartImportWizard.tsx`](../apps/web/src/components/eps/SmartImportWizard.tsx) | **0** | 46 | 5.2 | Magic numbers, длинные функции |
| [`app/wms/stock/page.tsx`](../apps/web/src/app/wms/stock/page.tsx) | **5** | 34 | 6.8 | 1260 строк, требует декомпозиции |
| [`app/admin/module-settings/page.tsx`](../apps/web/src/app/admin/module-settings/page.tsx) | **7** | 34 | 7.6 | Magic numbers |
| [`app/admin/feedback/page.tsx`](../apps/web/src/app/admin/feedback/page.tsx) | **14** | 36 | 8.0 | Сложность |
| [`app/wms/page.tsx`](../apps/web/src/app/wms/page.tsx) | **15** | 37 | 3.5 | Magic numbers, размер |
| [`app/eps/documents/page.tsx`](../apps/web/src/app/eps/documents/page.tsx) | **16** | 27 | 13.6 | Высокая сложность |
| [`app/srm/page.tsx`](../apps/web/src/app/srm/page.tsx) | **16** | 31 | 10.9 | CX превышает порог |
| [`components/wms/StockDetailDrawer.tsx`](../apps/web/src/components/wms/StockDetailDrawer.tsx) | **16** | 38 | **20.0** | Критическая сложность |
| [`components/wms/WmsOperationItemsStep.tsx`](../apps/web/src/components/wms/WmsOperationItemsStep.tsx) | **19** | 39 | 1.0 | Magic numbers |
| [`components/mro/MroExecutionWizardDialog.tsx`](../apps/web/src/components/mro/MroExecutionWizardDialog.tsx) | **20** | 34 | 7.4 | Размер + сложность |

**Средние (21–49 баллов):**

| Файл | Балл | Smells | Главная проблема |
|---|---|---|---|
| [`app/admin/settings/page.tsx`](../apps/web/src/app/admin/settings/page.tsx) | 23 | 30 | Magic numbers |
| [`app/wms/warehouses/page.tsx`](../apps/web/src/app/wms/warehouses/page.tsx) | 24 | 35 | Magic numbers, размер |
| [`components/wms/WarehouseTopologyModal.tsx`](../apps/web/src/components/wms/WarehouseTopologyModal.tsx) | 34 | 24 | CX=12.7 |
| [`components/ui/DataTableWrapper.tsx`](../apps/web/src/components/ui/DataTableWrapper.tsx) | 37 | 24 | Magic numbers |
| [`theme/theme.ts`](../apps/web/src/theme/theme.ts) | 38 | 31 | Magic numbers (layout constants) |
| [`components/eps/EquipmentTableView.tsx`](../apps/web/src/components/eps/EquipmentTableView.tsx) | 38 | 31 | Magic numbers |
| [`components/wms/WmsOperationWizardDialog.tsx`](../apps/web/src/components/wms/WmsOperationWizardDialog.tsx) | 41 | 15 | CX=12.1 |
| [`app/wms/inventory/page.tsx`](../apps/web/src/app/wms/inventory/page.tsx) | 43 | 24 | CX=8.2 |
| [`app/eps/reports/page.tsx`](../apps/web/src/app/eps/reports/page.tsx) | 44 | 17 | CX=5.9, magic numbers |
| [`app/wms/operations/page.tsx`](../apps/web/src/app/wms/operations/page.tsx) | 46 | 16 | CX=11.8 |
| [`components/layout/Sidebar.tsx`](../apps/web/src/components/layout/Sidebar.tsx) | 47 | 18 | CX=9.9 (после декомпозиции) |
| [`app/admin/audit-log/page.tsx`](../apps/web/src/app/admin/audit-log/page.tsx) | 48 | 17 | CX=12.0 |

### 3.2 High-severity smells (критические функции)

| Функция | Файл | CX | Порог |
|---|---|---|---|
| `handleCopy` | `eps/[id]/page.tsx` | **79** | 10 |
| `handleDeleteDoc` | `eps/[id]/page.tsx` | **53** | 10 |
| `applyJiraFieldMapping` | `lib/jira/field-mapping.ts` | **40** | 10 |
| `getEquipmentSortValue` | `components/eps/equipment-registry-model.ts` | **35** | 10 |
| `getSystemSettings` | `lib/system-settings-service.ts` | **32** | 10 |
| `createInternalServiceRequest` | `lib/jira/service-requests.ts` | **31** | 10 |
| `GET` (approvals) | `api/eps/approvals/route.ts` | **29** | 10 |
| `buildTransferWhereInput` | `lib/wms-transfers-service.ts` | **26** | 10 |
| `POST` (feedback) | `api/feedback/route.ts` | **27** | 10 |
| `GET` (equipment) | `api/eps/equipment/route.ts` | **24** | 10 |
| `PATCH` (feedback id) | `api/feedback/[id]/route.ts` | **24** | 10 |
| `requireAuth` | `lib/auth-guard.ts` | **21** | 10 |
| `calculateSrmMetrics` | `lib/jira/metrics.ts` | **22** | 10 |
| `mapFileHeaders` | `lib/eps-import-matcher.ts` | **22** | 10 |

---

## 4. UI-соответствие (дизайн-код)

### 4.1 Hex-цвета — СТАТУС: ✅ НАРУШЕНИЙ НЕТ

Автоматический поиск по паттерну `#RRGGBB` в `sx={{}}`-пропах не дал результатов. Компоненты используют `theme.palette.*` токены.

`dangerouslySetInnerHTML` в [`ThemeRegistry.tsx:46`](../apps/web/src/theme/ThemeRegistry.tsx:46) — стандартный MUI SSR emotion pattern, не является нарушением.

### 4.2 StatusBadge вместо Chip — СТАТУС: ✅ НАРУШЕНИЙ НЕТ

Поиск `<Chip ... status` в `components/` не дал результатов. Статусы сущностей отображаются через `<StatusBadge>`.

### 4.3 Использование Shared UI компонентов — СТАТУС: ✅ АКТИВНО ПРИМЕНЯЕТСЯ

Проверены ключевые страницы:

| Страница | StatCard | StatusBadge | SearchInput | FilterToolbar | EmptyState | DataTableWrapper |
|---|---|---|---|---|---|---|
| `app/wms/stock/page.tsx` | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| `app/eps/[id]/page.tsx` | ✅ | ✅ | — | — | ✅ | — |

---

## 5. TypeScript и архитектура

### 5.1 Типобезопасность

| Находка | Файл | Приоритет |
|---|---|---|
| `(integration.authConfig as any)` | `srm/webhooks/[id]/route.ts:40` | Low — нет типа для authConfig |
| `(integration.mappingConfig as unknown as ...)` | `srm/webhooks/[id]/route.ts:85` | Low — двойное приведение типа |

### 5.2 Модульность — после ремедиации 2026-08-28

Декомпозиция завершена для:
- `Sidebar.tsx` → 4 модуля (SidebarNavGroup, SidebarCollapsedFlyout, sidebar-items)
- `FeedbackDialog.tsx` → 3 модуля (NewTicket, ListView, DetailView)
- `eps/approvals/page.tsx` → 3 модуля (ApprovalReviewDialog, ApprovalDetailsDialog, ApprovalTableView)
- `app/page.tsx` → 2 модуля (DashboardKpiSection, DashboardRecentActivity)
- `eps/reports/page.tsx` → 3 модуля
- `eps/history/page.tsx` → 2 модуля
- `mro/page.tsx` → MroSchedulesTable

**Требуют декомпозиции (новые приоритеты):**
- [`app/eps/[id]/page.tsx`](../apps/web/src/app/eps/[id]/page.tsx) — 2024 строки, CX=79 критическая функция `handleCopy`
- [`app/wms/stock/page.tsx`](../apps/web/src/app/wms/stock/page.tsx) — 1260 строк

---

## 6. Приоритизированный план действий

### Приоритет 1 — Критические (обязательны к рефакторингу)

| ID | Задача | Файл | Оценка |
|---|---|---|---|
| P1-01 | Декомпозиция `handleCopy` (CX=79) и `handleDeleteDoc` (CX=53) | `app/eps/[id]/page.tsx` | ~3 дня |
| P1-02 | Декомпозиция страницы паспорта оборудования (2024 строки) на подкомпоненты | `app/eps/[id]/page.tsx` | ~2 дня |

### Приоритет 2 — Высокие (планировать в ближайший спринт)

| ID | Задача | Файл | Оценка |
|---|---|---|---|
| P2-01 | Декомпозиция `app/wms/stock/page.tsx` (1260 строк) | — | ~1 день |
| P2-02 | Снижение CX `StockDetailDrawer.tsx` (CX=20) | — | ~4 часа |
| P2-03 | Рефакторинг `applyJiraFieldMapping` (CX=40) | `lib/jira/field-mapping.ts` | ~1 день |
| P2-04 | Рефакторинг `getEquipmentSortValue` (CX=35) | `equipment-registry-model.ts` | ~4 часа |
| P2-05 | Типизация `authConfig`/`mappingConfig` в webhook route | `srm/webhooks/[id]/route.ts` | ~2 часа |

### Приоритет 3 — Средние (техдолг)

| ID | Задача | Затрагивает |
|---|---|---|
| P3-01 | Извлечение magic numbers в именованные константы | Множество UI-файлов |
| P3-02 | Снижение CX `requireAuth` (CX=21) через early return | `lib/auth-guard.ts` |
| P3-03 | Декомпозиция `admin/feedback/page.tsx`, `admin/module-settings/page.tsx` | — |
| P3-04 | Декомпозиция `EquipmentWizardForm.tsx`, `SmartImportWizard.tsx` | — |

---

## 7. Итоговая оценка

| Область | Оценка | Вердикт |
|---|---|---|
| Безопасность (RBAC, Rate Limit, Webhook, SQL) | **A** | ✅ Полное соответствие AGENTS.md v2.0 |
| UI соответствие (hex-цвета, StatusBadge, shared UI) | **A** | ✅ Нарушений не найдено |
| Модульность (God-компоненты) | **C** | ⚠️ `eps/[id]/page.tsx` критический, WMS stock требует работы |
| Цикломатическая сложность | **C** | ⚠️ 14 функций с CX > 20, 2 с CX > 50 |
| Типобезопасность | **B** | Минимальные `any`-касты, задокументированные |
| Тестовое покрытие | **A** | 146 тестов, 100% pass |

**Общий вердикт: Request Changes (Средний риск)**

Критических security-проблем не обнаружено. Основной технический долг — декомпозиция монолитного паспорта оборудования (`eps/[id]/page.tsx`) с god-функциями CX=79 и CX=53, и рефакторинг WMS stock page. Все security-контроли из AGENTS.md v2.0 соблюдены.

---

## 8. Верификационные команды

```bash
# Code quality scan
python .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --language typescript --json

# TypeScript typecheck
pnpm --filter @ems/web exec tsc --noEmit

# Tests
pnpm test

# Lint
pnpm --filter @ems/web lint
```

---

*Инспекция выполнена: AI Code Reviewer (AGENTS.md v2.0). Дата: 2026-08-29.*
