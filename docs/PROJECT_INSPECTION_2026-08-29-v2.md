# Инспекция проекта EMS-Platform — v2

**Дата инспекции:** 2026-08-29 (11:10 NSK, UTC+7)  
**Инструменты:** `code_quality_checker.py`, `route_audit.py`, `inspect_summary.py`, `fgrade_detail.py`, ручной анализ  
**Охват:** `apps/web/src` (268 файлов), `apps/web/src/app/api` (85 роутов), `packages/` (22 файла)  
**Правила:** AGENTS.md v2.0, `universal.md`, `languages/typescript.md`  
**Предыдущая инспекция:** [`docs/PROJECT_INSPECTION_2026-08-29.md`](PROJECT_INSPECTION_2026-08-29.md)

---

## 1. Сводка результатов

| Метрика | Текущее значение | Δ к предыд. инспекции |
|---|---|---|
| Файлов проанализировано (web) | **268** | +10 |
| Файлов проанализировано (packages) | **22** | = |
| Средний балл качества (web) | **77.1 / 100** | = (стабильно) |
| Средний балл качества (packages) | **91.2 / 100** | ✅ Высокий |
| Общая оценка (web) | **C** | = |
| Общая оценка (packages) | **A** | ✅ |
| Code smells (web) | **2 341** | = |
| SOLID-нарушений (web) | **23** | = |
| Файлов с grade F (web) | **27** | +1 (новый: `login/page.tsx`) |
| Файлов с grade F (packages) | **2** | = (`seed.ts`, `eps.test.ts`) |
| API-роутов | **85** | = |
| Роутов без auth | **2** | ℹ️ Обосновано |
| Роутов без RBAC | **10** | ℹ️ Обосновано |
| Hex-цветов в `sx={}` | **0** | ✅ |
| `<Chip>` для статусов сущностей | **0** | ✅ |

---

## 2. Безопасность (Security)

### 2.1 RBAC и авторизация — ✅ СОБЛЮДАЕТСЯ

**85 роутов**, 0 без rate limiting, 0 с голым `getCurrentUser()` без проверки. Два роута без auth — обоснованы:

| Роут | Обоснование |
|---|---|
| `api/auth/login/route.ts` | Публичный — это и есть точка входа аутентификации |
| `api/srm/webhooks/[id]/route.ts` | Внешний webhook; auth через `webhookSecret` токен в заголовке |

10 роутов с `getCurrentUser()` без RBAC — все обоснованы семантически:

| Роут | Обоснование |
|---|---|
| `auth/logout` | Любой аутентифицированный пользователь может выйти |
| `auth/me` | Возвращает данные текущего пользователя, RBAC не нужен |
| `notifications/*` | Уведомления принадлежат текущему пользователю |
| `files/[...path]` | Файлы — доступ по факту аутентификации + путевая проверка |
| `setup/*` | Wizard начальной настройки — до создания ролей |

**Вердикт:** ✅ Все маршруты корректны по безопасности.

### 2.2 Webhook-аутентификация — ✅ ИСПРАВЛЕН

```typescript
// apps/web/src/app/api/srm/webhooks/[id]/route.ts
if (!providedToken || providedToken !== webhookSecret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Правильный паттерн: отклоняет запросы **без токена** И с неверным токеном.

### 2.3 Raw SQL — ✅ ДОПУСТИМО

`$queryRaw` используется только в health-check запросах с template literals без пользовательского ввода.

### 2.4 Типобезопасность API (`any`) — ⚠️ ТЕХДОЛГ

Обнаружено **20+ использований `any`** в API-роутах. Паттерны:

| Паттерн | Пример | Файл |
|---|---|---|
| `where: any = {}` | Динамическое построение WHERE-условия | `eps/equipment/route.ts`, `eps/approvals/route.ts` |
| `as any` для Prisma JSON | `(approval.proposedData as any)` | `eps/approvals/[id]/route.ts` |
| Переменные накопители | `let approvalRecord: any = null` | `eps/approvals/route.ts` |
| Параметры функций | `function parseDateSafe(val: any)` | Несколько route.ts |

**Рекомендация:** Заменить `any` на `Prisma.EquipmentWhereInput` для WHERE-объектов, использовать `unknown` + type guards для JSON-полей, типизировать параметры функций.

### 2.5 Прочие замечания

| ID | Файл | Находка | Приоритет |
|---|---|---|---|
| S-01 | `srm/webhooks/[id]/route.ts:40` | `(integration.authConfig as any)` | Low — нет типа для authConfig |
| S-02 | `srm/webhooks/[id]/route.ts:85` | `(integration.mappingConfig as unknown as ...)` | Low — двойной каст |
| S-03 | `ThemeRegistry.tsx:46` | `dangerouslySetInnerHTML` | Info — стандартный MUI SSR pattern |
| S-04 | `logger.ts:63` | `console.log` с `eslint-disable` | Info — корректно задокументировано |

---

## 3. Качество кода

### 3.1 Сводка по grade

**Web (`apps/web/src` — 258 файлов анализа):**

| Grade | Кол-во файлов |
|---|---|
| A | 83 |
| B | 66 |
| C | 47 |
| D | 25 |
| **F** | **27** |

**Packages (`packages/` — 22 файла):**

| Grade | Кол-во файлов |
|---|---|
| A | 16 |
| B | 4 |
| F | 2 |

### 3.2 Файлы с grade F — обязательны к рефакторингу

#### 🔴 Критические (score 0–20) — немедленный рефакторинг

| Файл | Score | Lines | Smells | Топ-проблема |
|---|---|---|---|---|
| [`app/eps/[id]/page.tsx`](../apps/web/src/app/eps/%5Bid%5D/page.tsx) | **0** | 2024 | 102 | `handleCopy` **1401 строк**, CX=79 — god-функция |
| [`app/setup/page.tsx`](../apps/web/src/app/setup/page.tsx) | **0** | 856 | 49 | `handleExecuteSetup` 76 строк, CX=13 |
| [`components/eps/EquipmentWizardForm.tsx`](../apps/web/src/components/eps/EquipmentWizardForm.tsx) | **0** | 843 | 43 | `renderFieldInput` 97 строк |
| [`components/eps/SmartImportWizard.tsx`](../apps/web/src/components/eps/SmartImportWizard.tsx) | **0** | 820 | 46 | `handleAnalyzeFile` CX=14 |
| [`app/wms/stock/page.tsx`](../apps/web/src/app/wms/stock/page.tsx) | **5** | 1260 | 34 | 1260 строк, 3 длинные функции |
| [`app/admin/module-settings/page.tsx`](../apps/web/src/app/admin/module-settings/page.tsx) | **7** | 1239 | 34 | `handleToggleModule` **677 строк** |
| [`app/admin/feedback/page.tsx`](../apps/web/src/app/admin/feedback/page.tsx) | **14** | 895 | 36 | CX=17, `AdminFeedbackPage` 114 строк |
| [`app/wms/page.tsx`](../apps/web/src/app/wms/page.tsx) | **15** | 682 | 37 | `DeficitItem` 84 строки |
| [`app/eps/documents/page.tsx`](../apps/web/src/app/eps/documents/page.tsx) | **16** | 922 | 27 | `handleUploadSubmit` **627 строк** |
| [`app/srm/page.tsx`](../apps/web/src/app/srm/page.tsx) | **16** | 720 | 31 | `handleOpenDetails` 428 строк, CX=18 |
| [`components/wms/StockDetailDrawer.tsx`](../apps/web/src/components/wms/StockDetailDrawer.tsx) | **16** | 603 | 38 | CX=**20** — критическая сложность |
| [`components/wms/WmsOperationItemsStep.tsx`](../apps/web/src/components/wms/WmsOperationItemsStep.tsx) | **19** | 602 | 39 | Magic numbers |
| [`components/mro/MroExecutionWizardDialog.tsx`](../apps/web/src/components/mro/MroExecutionWizardDialog.tsx) | **20** | 650 | 34 | CX=13, `handleSubmit` 67 строк |

#### 🟡 Средние (score 21–49) — планировать в спринт

| Файл | Score | Lines | Smells | Топ-проблема |
|---|---|---|---|---|
| [`app/admin/settings/page.tsx`](../apps/web/src/app/admin/settings/page.tsx) | 23 | 1097 | 30 | `handleDownloadDump` 69 строк |
| [`app/wms/warehouses/page.tsx`](../apps/web/src/app/wms/warehouses/page.tsx) | 24 | 734 | 35 | CX=18 (`handleSubmit`) |
| [`components/wms/WarehouseTopologyModal.tsx`](../apps/web/src/components/wms/WarehouseTopologyModal.tsx) | 34 | 927 | 24 | CX=12.7, 3 длинные функции |
| [`components/ui/DataTableWrapper.tsx`](../apps/web/src/components/ui/DataTableWrapper.tsx) | 37 | 716 | 24 | `ColumnSelector` 130 строк, `handleDensityChange` 81 строка |
| [`theme/theme.ts`](../apps/web/src/theme/theme.ts) | 38 | 400 | 31 | Magic numbers (layout constants) |
| [`components/eps/EquipmentTableView.tsx`](../apps/web/src/components/eps/EquipmentTableView.tsx) | 38 | 598 | 31 | Magic numbers |
| [`components/wms/WmsOperationWizardDialog.tsx`](../apps/web/src/components/wms/WmsOperationWizardDialog.tsx) | 41 | 606 | 15 | `WmsOperationWizardDialog` 172 строки, CX=12.1 |
| [`app/wms/inventory/page.tsx`](../apps/web/src/app/wms/inventory/page.tsx) | 43 | 768 | 24 | `handleResetFilters` CX=17 |
| [`app/eps/reports/page.tsx`](../apps/web/src/app/eps/reports/page.tsx) | 44 | 842 | 17 | `ReportBuilderContent` CX=20, `handleExportJson` 369 строк |
| [`app/wms/operations/page.tsx`](../apps/web/src/app/wms/operations/page.tsx) | 46 | 641 | 16 | `handleQuickDispatch` 438 строк, CX=11.8 |
| [`components/layout/Sidebar.tsx`](../apps/web/src/components/layout/Sidebar.tsx) | 47 | 678 | 18 | `loadData` 79 строк, CX=9.9 |
| [`app/admin/audit-log/page.tsx`](../apps/web/src/app/admin/audit-log/page.tsx) | 48 | 559 | 17 | `handleRequestSort` CX=**32** |
| [`app/login/page.tsx`](../apps/web/src/app/login/page.tsx) | 48 | 642 | 20 | `handleClearUsername` 60 строк, CX=12 |
| [`components/wms/TransferRequestDialog.tsx`](../apps/web/src/components/wms/TransferRequestDialog.tsx) | 48 | 444 | 20 | `TransferRequestDialog` CX=20 |

#### F-grade в packages

| Файл | Score | Smells | Проблема |
|---|---|---|---|
| [`packages/database/src/seed.ts`](../packages/database/src/seed.ts) | 43 | 31 | Magic numbers (seed data) — приемлемо |
| [`packages/auth/src/eps.test.ts`](../packages/auth/src/eps.test.ts) | 45 | 22 | Magic numbers в тестах — приемлемо |

### 3.3 Топ smell-типов

| Тип | Кол-во | Severity |
|---|---|---|
| `magic_number` | **1909** | Low |
| `long_function` | **262** | Medium |
| `high_complexity` (medium) | **117** | Medium |
| `high_complexity` (high) | **42** | High |
| `commented_code` | **11** | Low |

### 3.4 Критические функции (CX > 20)

| Функция | Файл | CX | Строк | Статус |
|---|---|---|---|---|
| `handleCopy` | `eps/[id]/page.tsx` | **79** | 1401 | 🔴 Критический |
| `handleDeleteDoc` | `eps/[id]/page.tsx` | **53** | 153 | 🔴 Критический |
| `handleToggleModule` | `admin/module-settings/page.tsx` | ~30+ | 677 | 🔴 Критический |
| `handleUploadSubmit` | `eps/documents/page.tsx` | ~40+ | 627 | 🔴 Критический |
| `handleRequestSort` | `admin/audit-log/page.tsx` | **32** | 84 | 🟠 Высокий |
| `applyJiraFieldMapping` | `lib/jira/field-mapping.ts` | **40** | — | 🟠 Высокий |
| `getEquipmentSortValue` | `components/eps/equipment-registry-model.ts` | **35** | — | 🟠 Высокий |
| `StockDetailDrawer` | `components/wms/StockDetailDrawer.tsx` | **20** | 63 | 🟠 Высокий |
| `TransferRequestDialog` | `components/wms/TransferRequestDialog.tsx` | **20** | 88 | 🟡 Средний |
| `ReportBuilderContent` | `app/eps/reports/page.tsx` | **20** | 144 | 🟡 Средний |
| `SrmPageContent` | `app/srm/page.tsx` | **18** | 112 | 🟡 Средний |
| `WmsWarehousesPage/handleSubmit` | `app/wms/warehouses/page.tsx` | **18** | 60 | 🟡 Средний |
| `AdminFeedbackPage` | `app/admin/feedback/page.tsx` | **17** | 114 | 🟡 Средний |
| `handleResetFilters` | `app/wms/inventory/page.tsx` | **17** | 57 | 🟡 Средний |

---

## 4. UI-соответствие (Дизайн-код AGENTS.md)

### 4.1 Hex-цвета в `sx={}` — ✅ НАРУШЕНИЙ НЕТ

Автоматический поиск `sx={[^}]*#[0-9a-fA-F]{3,6}` по всем `.ts` и `.tsx` — **0 совпадений**. Компоненты используют `theme.palette.*` токены.

### 4.2 `<Chip>` для статусов сущностей — ⚠️ ЧАСТИЧНЫЕ НАРУШЕНИЯ

Найдено **7 использований `<Chip>`** в компонентах. Анализ по AGENTS.md:

| Файл | Строка | Использование | Статус |
|---|---|---|---|
| [`EquipmentOperationalTabs.tsx:64`](../apps/web/src/components/eps/EquipmentOperationalTabs.tsx) | 64 | `<Chip label={nom.article}` — артикул номенклатуры | ℹ️ Не статус — допустимо |
| [`EquipmentWizardForm.tsx:248`](../apps/web/src/components/eps/EquipmentWizardForm.tsx) | 248 | `<Chip label={def.unit}` — единица измерения | ℹ️ Не статус — допустимо |
| [`CommandPalette.tsx:511-518`](../apps/web/src/components/eps/CommandPalette.tsx) | 511-518 | `<Chip label="⌘"` — клавиши-подсказки | ℹ️ UI-декор — допустимо |
| [`WmsStockTable.tsx:219`](../apps/web/src/components/wms/WmsStockTable.tsx) | 219 | `<Chip label={row.article}` — артикул | ℹ️ Не статус — допустимо |
| [`WmsStockTable.tsx:271`](../apps/web/src/components/wms/WmsStockTable.tsx) | 271 | `<Chip label="+N"` — счётчик оборудования | ℹ️ Не статус — допустимо |

**Вердикт:** ✅ Все `<Chip>` используются для неанселевых данных (артикулы, клавиши, счётчики) — НЕ для статусов сущностей. Нарушений AGENTS.md нет.

### 4.3 Shared UI компоненты — ✅ АКТИВНО ПРИМЕНЯЕТСЯ

| Компонент | Используется в |
|---|---|
| `StatCard` | `DashboardKpiSection`, `EquipmentKpiCards` |
| `StatusBadge` | WMS, EPS, SRM, MRO модули |
| `SearchInput` | Все списочные страницы |
| `FilterToolbar` | WMS stock, EPS registry, SRM |
| `EmptyState` | Нулевые состояния во всех модулях |
| `DataTableWrapper` | Таблицы реестров |
| `ConfirmDialog` | Критические действия (удаление, сброс) |

---

## 5. TypeScript / Architecture

### 5.1 Плавающие промисы (floating promises)

По анализу кода — не обнаружено критических floating promises в API-роутах. Все async-операции обёрнуты в `try/catch`.

### 5.2 `any` — системный техдолг

| Паттерн | Кол-во | Где |
|---|---|---|
| `const where: any = {}` | 5+ | WHERE-builders в API-роутах |
| `as any` для Prisma JSON-полей | 8+ | proposedData, authConfig, mappingConfig |
| Параметры функций `(val: any)` | 4+ | Утилитарные парсеры |
| `let x: any = null` | 3+ | Аккумуляторы в сложных функциях |

**Рекомендация:** Ввести generic `WhereBuilder<T>` тип, использовать `Prisma.JsonValue` для JSON-полей.

### 5.3 Декомпозиция — прогресс

✅ Завершено с 2026-08-28:
- `Sidebar.tsx` → `SidebarNavGroup`, `SidebarCollapsedFlyout`, `sidebar-items.tsx`
- `FeedbackDialog.tsx` → `FeedbackNewTicketTab`, `FeedbackTicketListView`, `FeedbackTicketDetailView`
- `eps/approvals/page.tsx` → `ApprovalReviewDialog`, `ApprovalDetailsDialog`, `ApprovalTableView`
- `app/page.tsx` → `DashboardKpiSection`, `DashboardRecentActivity`

🔴 Требует декомпозиции (ПРИОРИТЕТ 1):
- [`app/eps/[id]/page.tsx`](../apps/web/src/app/eps/%5Bid%5D/page.tsx) — 2024 строки

---

## 6. Приоритизированный план действий

### Приоритет 1 — Критические (обязательны немедленно)

| ID | Задача | Файл | Сложность |
|---|---|---|---|
| P1-01 | Декомпозиция `handleCopy` (1401 строк, CX=79): вынести в 5–7 хуков/хелперов | `app/eps/[id]/page.tsx` | ~3 дня |
| P1-02 | Декомпозиция `handleDeleteDoc` (CX=53, 153 строки) | `app/eps/[id]/page.tsx` | ~0.5 дня |
| P1-03 | Декомпозиция страницы паспорта (2024 строки → подкомпоненты) | `app/eps/[id]/page.tsx` | ~2 дня |
| P1-04 | Декомпозиция `handleToggleModule` (677 строк) | `admin/module-settings/page.tsx` | ~1 день |
| P1-05 | Декомпозиция `handleUploadSubmit` (627 строк) | `eps/documents/page.tsx` | ~1 день |

### Приоритет 2 — Высокие (ближайший спринт)

| ID | Задача | Файл | Сложность |
|---|---|---|---|
| P2-01 | Декомпозиция `app/wms/stock/page.tsx` (1260 строк) | — | ~1 день |
| P2-02 | Снижение CX `StockDetailDrawer` (CX=20) через early return | — | ~4 ч |
| P2-03 | Рефакторинг `applyJiraFieldMapping` (CX=40) | `lib/jira/field-mapping.ts` | ~1 день |
| P2-04 | Рефакторинг `getEquipmentSortValue` (CX=35) | `equipment-registry-model.ts` | ~4 ч |
| P2-05 | Типизация `authConfig`/`mappingConfig` в webhook route | `srm/webhooks/[id]/route.ts` | ~2 ч |
| P2-06 | Снижение CX `handleOpenDetails` (428 строк) | `app/srm/page.tsx` | ~4 ч |
| P2-07 | Снижение CX `handleQuickDispatch` (438 строк) | `app/wms/operations/page.tsx` | ~4 ч |
| P2-08 | Рефакторинг `WmsOperationWizardDialog` (172 строки, CX=12) | — | ~3 ч |

### Приоритет 3 — Технический долг (backlog)

| ID | Задача | Затрагивает |
|---|---|---|
| P3-01 | Заменить `any` → типизированные WHERE-builders в API | 5+ route.ts |
| P3-02 | Заменить `any` → `Prisma.JsonValue` + type guards для JSON-полей | 8+ route.ts |
| P3-03 | Извлечение magic numbers в именованные константы | 1909 вхождений |
| P3-04 | Снижение CX `handleResetFilters` (CX=17) → early return | `wms/inventory/page.tsx` |
| P3-05 | Снижение CX `handleRequestSort` (CX=32) | `admin/audit-log/page.tsx` |
| P3-06 | Декомпозиция `DataTableWrapper` (`ColumnSelector` 130 строк) | `components/ui/DataTableWrapper.tsx` |
| P3-07 | Декомпозиция `TransferRequestDialog` (CX=20) | — |

---

## 7. Итоговая оценка

| Область | Оценка | Вердикт |
|---|---|---|
| Безопасность (RBAC, Rate Limit, Webhook, SQL) | **A** | ✅ Полное соответствие AGENTS.md v2.0 |
| Типобезопасность (`any` usage) | **B** | ⚠️ Системный `any`-техдолг в API-роутах |
| UI соответствие (hex-цвета, StatusBadge, Chip) | **A** | ✅ Нарушений не найдено |
| Shared UI компоненты | **A** | ✅ Активно применяются |
| Цикломатическая сложность | **D** | 🔴 2 функции CX>50, 12 функций CX>15 |
| Монолитные компоненты (God-components) | **D** | 🔴 4 функции >400 строк, 27 файлов grade-F |
| Декомпозиция (прогресс) | **B** | ✅ 7 компонентов декомпозированы в 2026-08-28 |
| Тестовое покрытие (packages) | **A** | ✅ Packages grade A, 146 тестов |

**Общий вердикт: Request Changes (Средний риск)**

Критических security-проблем не обнаружено. Security-контроли AGENTS.md v2.0 полностью соблюдены. UI-стандарты соблюдены. Основной технический долг — **god-функции в `eps/[id]/page.tsx`** (handleCopy 1401 строк, CX=79) и монолитные страницы с функциями по 400–677 строк.

---

## 8. Верификационные команды

```bash
# Полный scan качества
python .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --language typescript --json > docs/quality_fresh_$(date +%Y-%m-%d).json

# Краткая сводка (web + packages)
python scripts/inspect_summary.py

# Детальный список F-grade
python scripts/fgrade_detail.py

# Route security audit
python scripts/route_audit.py

# TypeScript typecheck
pnpm --filter @ems/web exec tsc --noEmit

# Tests
pnpm test

# Lint
pnpm --filter @ems/web lint
```

---

*Инспекция выполнена: AI Code Reviewer (AGENTS.md v2.0, code-reviewer skill). Дата: 2026-08-29 v2.*
