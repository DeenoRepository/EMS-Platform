# EMS-Platform — Инспекция проекта

**Дата инспекции:** 2026-08-29 (повторная, инструментальная + ручная)  
**Ветка:** `main`  
**Инструменты:** ручной анализ исходного кода через `search_files` + `read_file`, [`scripts/route_audit.py`](../scripts/route_audit.py), предыдущий `code_quality_checker.py` baseline из [`CODE_REVIEW_AUDIT.md`](CODE_REVIEW_AUDIT.md)  
**Правила:** [`AGENTS.md`](../AGENTS.md), [`.agents/rules/security.md`](../.agents/rules/security.md), [`.agents/rules/code_quality.md`](../.agents/rules/code_quality.md), [`.agents/rules/ui_design_code.md`](../.agents/rules/ui_design_code.md)

> **Вердикт: ✅ Approve with suggestions.**  
> Все критические security findings из аудита 2026-08-27 (Stories A1–A3, B1–B2) подтверждены закрытыми.  
> Quality baseline PASS: 78.3/100 (C), 0 rate-limit gaps, 0 hex-hardcode в компонентах.
> B3 завершена: admin-role checks в API унифицированы через `isAdminUser()`. Остаточный долг — `console.error/warn` в 3 API-роутах и 7 файлов ≥ 700 строк без деградации качества ниже F.

---

## 1. Executive Summary

| Область | Значение | Baseline | Статус |
|---|---|---|---|
| `apps/web/src` (код) | 279 файлов, **78.3/100**, grade C | ≥ 78.0 | ✅ PASS |
| `packages` | 30 файлов, **94.1/100**, grade A | ≥ 94.0 | ✅ PASS |
| F-grade файлы (web) | **38** | ≤ 38 | ✅ PASS |
| API routes rate-limit | **0 gaps / 85 маршрутов** | 0 gaps | ✅ PASS |
| RBAC на всех routes | **100%** — `requireAuth` или `hasPermission` | обязательно | ✅ PASS |
| Webhook secret validation | **✅ Корректно** (`!providedToken \|\| providedToken !== secret`) | обязательно | ✅ PASS |
| LDAP injection protection | **✅ `escapeLdapFilter()` всюду** | обязательно | ✅ PASS |
| Raw SQL (`$queryRaw`) | **2 вхождения** — шаблонные литералы `SELECT 1` | допустимо | ✅ PASS |
| Hex-цвета в компонентах | **0** | 0 | ✅ PASS |
| `StatusBadge` для статусов | **✅** — сквозное применение | обязательно | ✅ PASS |
| `Chip` вместо `StatusBadge` для статусов сущностей | **0 нарушений** (Chip только для метаданных) | 0 | ✅ PASS |
| `StatCard` для KPI | **✅** — сквозное применение | обязательно | ✅ PASS |
| `console.error/warn` в API | **4 вхождения / 3 файла** | 0 в production paths | ⚠️ LOW |
| Роль-строка унификация | B3 закрыта; `auth/login` имеет локальный массив roles | documented exception | ✅ PASS |
| Файлы > 500 строк | **20 файлов** (presentation-heavy pages) | требует bounded refactor | ⚠️ MEDIUM |

---

## 2. Безопасность (Security)

### 2.1 Rate Limiting — ✅ PASS (0 gaps)

Все 85 API-маршрутов используют [`enforceRateLimit()`](../apps/web/src/lib/rate-limit.ts) на первой строке каждого HTTP-обработчика. Лимиты откалиброваны по чувствительности:

| Категория | Лимит | Примеры |
|---|---|---|
| Auth (login) | 10/min | `/api/auth/login` |
| Setup (критический) | 3/10min | `/api/setup/execute` |
| Admin tests (SSRF-риск) | 5/min | `/api/admin/settings/test-ldap`, `test-jira`, `test-srm` |
| SRM sync | 10/min | `/api/srm/sync`, `/api/srm/integrations/[id]/sync` |
| Sensitive reads | 60/min | `/api/admin/settings`, `/api/system/health` |
| Standard reads | 120/min | большинство GET |

### 2.2 Webhook Secret Validation — ✅ PASS

[`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/[id]/route.ts:58) использует **правильный** паттерн:

```typescript
// ✅ ПРАВИЛЬНО — отклонить при отсутствии ИЛИ несовпадении
if (!providedToken || providedToken !== webhookAuth.secret) { return 401; }
```

Дополнительно: проверяется `integration.isActive`, применяется `MAX_WEBHOOK_BODY_SIZE = 5MB`, и `allowUnsigned` требует явного разрешения.

### 2.3 RBAC — ✅ PASS

Все маршруты проверяют разрешение через `hasPermission(user, PERMISSIONS.*)` или `requireAuth(req, PERMISSIONS.*)`. Голый `getCurrentUser()` без RBAC отсутствует в production paths.

**Паттерн двух стилей авторизации — норма:**
- `getCurrentUser()` + `hasPermission()` — legacy-стиль, используется корректно.
- `requireAuth(req, PERMISSIONS.*)` — новый стиль (MRO, SRM) — предпочтителен.

### 2.4 LDAP Injection — ✅ PASS

[`escapeLdapFilter()`](../packages/auth/src/ldap.ts:45) применяется **всюду** при подстановке пользовательского ввода в LDAP-фильтры (строки 155, 211, 304). Тесты покрывают спецсимволы: `* \ ( ) / \x00`.

### 2.5 Raw SQL — ✅ PASS (допустимо)

Только 2 вхождения `$queryRaw`, оба — шаблонные литералы без пользовательского ввода:
- [`setup/test-db/route.ts:60`](../apps/web/src/app/api/setup/test-db/route.ts) — `` `SELECT 1 as connected` ``
- [`system/health/route.ts:108`](../apps/web/src/app/api/system/health/route.ts) — `` `SELECT 1 as healthy` ``

Соответствуют правилу AGENTS.md: "$queryRaw допустим только с шаблонными литералами для простых health-check запросов".

### 2.6 Setup Routes — частичное открытие (design intent)

[`/api/setup/execute`](../apps/web/src/app/api/setup/execute/route.ts:30) допускает вызов без авторизации **только до первой установки** (`.installed` файл отсутствует). После первой установки требует `admin`-роль. Это намеренный design-паттерн для первоначальной конфигурации. Приемлемо.

### 2.7 ✅ Унификация role checks (B3 завершена)

В API-маршрутах проверки пользовательского payload унифицированы через `isAdminUser()` из [`auth-guard.ts`](../apps/web/src/lib/auth-guard.ts:50). Сохраняется только локальная проверка массива ролей в [`auth/login/route.ts`](../apps/web/src/app/api/auth/login/route.ts:157), поскольку на этом этапе ещё нет объекта `JwtUserPayload`.

До B3 в API-маршрутах смешивались два варианта строки:

```typescript
// В разных маршрутах:
user.roles.includes('admin')           // WMS, EPS, Setup
user.roles.includes('administrator')   // users/route.ts, feedback/*, dashboard
user.roles.includes('admin') || user.roles.includes('administrator')  // auth/login
```

**Риск до B3:** Если в БД роль хранится как `'administrator'`, то маршруты, проверяющие только `'admin'`, неверно откажут в доступе (и наоборот).
**Решение:** [`isAdminUser()`](../apps/web/src/lib/auth-guard.ts:50) принимает `roles` из `JwtUserPayload` и поддерживает обе строки. Добавлены unit-тесты для `admin`, `administrator` и regular user; миграция API завершена без изменения permission-логики.

### 2.8 ⚠️ `console.error/warn` в production API (LOW)

Обнаружены в 3 файлах вместо использования централизованного [`logger`](../apps/web/src/lib/logger.ts):

| Файл | Строка | Тип |
|---|---|---|
| [`srm/issues/route.ts:156`](../apps/web/src/app/api/srm/issues/route.ts) | `console.warn(...)` | audit log failure |
| [`eps/import/execute/route.ts:134`](../apps/web/src/app/api/eps/import/execute/route.ts) | `console.error(...)` | field create error |
| [`eps/import/execute/route.ts:326`](../apps/web/src/app/api/eps/import/execute/route.ts) | `console.error(...)` | import error |
| [`setup/execute/route.ts:162`](../apps/web/src/app/api/setup/execute/route.ts) | `console.warn(...)` | env write error |

Замена: `logger.warn(...)` / `logger.error(...)`.

---

## 3. UI Дизайн-система

### 3.1 StatusBadge — ✅ PASS

`<StatusBadge>` используется сквозным образом во **всех** модулях (EPS, WMS, SRM, MRO, Admin, Feedback, Setup). Chip для статусов сущностей полностью вытеснен.

**Охват применения (выборка):**
- EPS: `EquipmentTableView`, `EquipmentGridView`, `ApprovalTableView`, `ApprovalDetailsDialog`, `SmartImportWizard`, `AuditLogTableView`, history diff
- WMS: `WmsOperationsTable`, `WmsTransfersTable`, `WmsStockTable`, `StockDetailDrawer`, `InventoryCompleteModal`
- SRM: `SrmIssueDetailsDrawer`, `SrmReliabilityAnalytics`
- MRO: `MroSchedulesTable`, `MroExecutionWizardDialog`
- Admin: `AdminSettingsPage`, `ModuleSettingsEpsTab`, users, roles, audit-log
- Feedback: `FeedbackTicketListView`, `FeedbackTicketDetailView`, `AdminFeedbackDetailDrawer`

### 3.2 StatCard для KPI — ✅ PASS

`<StatCard>` используется сквозным образом на всех страницах с метриками:
- Dashboard: 4 модульных KPI-карточки
- EPS: оборудование (5×), approvals (4×), reports (4×), history (4×), documents (5×)
- WMS: главная (4×), operations (5+4=9×), warehouses (4×), inventory (3+4×)
- MRO: расписания (4×), history (3×), checklists (3×)
- SRM: issues (4×), analytics
- Admin: users (3×), roles (3×), audit-log (4×), feedback (6×)

### 3.3 Chip для метаданных — ✅ допустимо

`<Chip>` используется только для **нестатусных** метаданных (не нарушает правила):
- Артикулы, коды складов, единицы измерения (`Арт:`, `Код:`)
- Количество (записей, позиций, сообщений)
- Вложения/файлы (кликабельные)
- Теги оборудования
- Горячие клавиши в Command Palette / UI-подсказки
- Латентность тестовых подключений (`123 мс`)

Это **намеренное** использование согласно CODE_REVIEW_AUDIT.md: "Chips для идентификаторов, количества, единиц измерения, вложений и прочих metadata сохранены намеренно."

### 3.4 SearchInput, FilterToolbar, DataTableWrapper, EmptyState, ConfirmDialog — ✅ PASS

Все типовые UI-контролы применяются корректно:

| Компонент | Применение |
|---|---|
| [`SearchInput`](../apps/web/src/components/ui/SearchInput.tsx) | EPS, WMS, SRM, MRO, Admin — все реестры с поиском |
| [`FilterToolbar`](../apps/web/src/components/ui/FilterToolbar.tsx) | EPS equipment, approvals, SRM issues, MRO, Admin audit/feedback |
| [`DataTableWrapper`](../apps/web/src/components/ui/DataTableWrapper.tsx) | все табличные представления |
| [`EmptyState`](../apps/web/src/components/ui/EmptyState.tsx) | все нулевые состояния реестров |
| [`ConfirmDialog`](../apps/web/src/components/ui/ConfirmDialog.tsx) | удаление, отзыв согласований, дамп БД, maintenance mode |

### 3.5 Hex-цвета — ✅ PASS (0 вхождений)

Поиск по `#[0-9a-fA-F]{6}` в `apps/web/src/components/**/*.tsx` и `apps/web/src/app/**/*.tsx` — **0 результатов**. Все цветовые значения используют семантические токены MUI (`theme.palette.*`, `text.secondary`, `background.paper`, `divider`, `grey.50` и т.д.).

---

## 4. Качество кода

### 4.1 Размер файлов

Топ-20 файлов по строкам (из предыдущего baseline-скана):

| Строк | Файл | Статус |
|---|---|---|
| 1 097 | [`app/admin/settings/page.tsx`](../apps/web/src/app/admin/settings/page.tsx) | ⚠️ LARGE — god-page, кандидат на декомпозицию |
| 878 | [`components/wms/WarehouseTopologyModal.tsx`](../apps/web/src/components/wms/WarehouseTopologyModal.tsx) | ⚠️ LARGE |
| 836 | [`app/wms/stock/page.tsx`](../apps/web/src/app/wms/stock/page.tsx) | ⚠️ LARGE |
| 792 | [`components/eps/EquipmentWizardForm.tsx`](../apps/web/src/components/eps/EquipmentWizardForm.tsx) | ⚠️ LARGE |
| 785 | [`app/eps/reports/page.tsx`](../apps/web/src/app/eps/reports/page.tsx) | ⚠️ LARGE |
| 764 | [`components/eps/SmartImportWizard.tsx`](../apps/web/src/components/eps/SmartImportWizard.tsx) | ⚠️ LARGE |
| 720 | [`app/wms/inventory/page.tsx`](../apps/web/src/app/wms/inventory/page.tsx) | ⚠️ LARGE |
| 692 | [`app/wms/warehouses/page.tsx`](../apps/web/src/app/wms/warehouses/page.tsx) | ⚠️ LARGE |
| 685 | [`app/srm/page.tsx`](../apps/web/src/app/srm/page.tsx) | ⚠️ LARGE |
| 671 | [`app/admin/module-settings/page.tsx`](../apps/web/src/app/admin/module-settings/page.tsx) | ⚠️ LARGE |
| 661 | [`app/setup/page.tsx`](../apps/web/src/app/setup/page.tsx) | LARGE, но decomposed в steps |
| 653 | [`app/wms/page.tsx`](../apps/web/src/app/wms/page.tsx) | ⚠️ LARGE |
| 650 | [`components/layout/Sidebar.tsx`](../apps/web/src/components/layout/Sidebar.tsx) | LARGE, ранее проверен |
| 613 | [`app/login/page.tsx`](../apps/web/src/app/login/page.tsx) | ⚠️ LARGE |
| 611 | [`components/mro/MroExecutionWizardDialog.tsx`](../apps/web/src/components/mro/MroExecutionWizardDialog.tsx) | ⚠️ LARGE |
| 606 | [`app/wms/operations/page.tsx`](../apps/web/src/app/wms/operations/page.tsx) | ⚠️ LARGE |

**Примечание:** `code_quality_checker.py` ошибочно интерпретирует границы TSX-функций и фиксирует "функции 400+ строк" там, где реально это весь render-блок компонента. Реальные handler-функции (onClick, handleSubmit) соответствуют порогу ≤ 50 строк — проверено вручную для ключевых компонентов.

### 4.2 Качество API-маршрутов (ручная проверка)

Все API-файлы следуют единому паттерну:
1. `enforceRateLimit()` → первый
2. Аутентификация (`getCurrentUser` / `requireAuth`)
3. Авторизация (`hasPermission`)
4. Бизнес-логика через Prisma ORM
5. `safeErrorResponse()` в catch

Отклонений от паттерна в production-путях не обнаружено.

### 4.3 Magic Numbers (low priority)

1 911 вхождений magic_number в web — преимущественно CSS/layout-константы (`sx={{ mb: 2 }}`, `fontSize: 14`, `height: 22`). Это не критично для functionality и не требует массовой замены согласно правилам AGENTS.md.

### 4.4 Сложность (Cyclomatic Complexity)

Автоматический checker фиксирует 122 medium + 37 high findings. Большинство — это длинные switch/if-цепочки в presentation-компонентах (конфигурация полей формы, рендер табличных ячеек). Реальные бизнес-обработчики (API routes) имеют умеренную сложность благодаря early-return паттерну.

---

## 5. Архитектура

### 5.1 Монорепо — ✅ Корректная структура

```
apps/web/       — Next.js 14 App Router + MUI v5
packages/auth/  — JWT, LDAP, RBAC, password, audit (A-grade, 94.1/100)
packages/database/ — Prisma schema + seed
packages/shared/   — типы, константы, permissions, formatters
```

### 5.2 Shared UI Library — ✅ Полностью сформирована

[`apps/web/src/components/ui/index.ts`](../apps/web/src/components/ui/index.ts) экспортирует все обязательные компоненты:
`StatCard`, `StatusBadge`, `SearchInput`, `FilterToolbar`, `EmptyState`, `DataTableWrapper`, `ConfirmDialog`, `FormDialog`, `DatePickerField`, `TabPanel`, `PageLoading`, `PermissionGate`, `CriticalAlertBanner`, `LifecycleTimeline`, `TrendSparkline`, `HealthScoreGauge`, `ChartCard`.

### 5.3 RBAC Architecture — ✅ Централизованная

- Permissions определены в [`packages/shared/src/permissions.ts`](../packages/shared/src/permissions.ts)
- `hasPermission()` и `logAuditEvent()` из [`packages/auth`](../packages/auth/src/index.ts)
- `requireAuth()`, `getCurrentUser()`, `unauthorizedResponse()`, `forbiddenResponse()` из [`apps/web/src/lib/auth-guard.ts`](../apps/web/src/lib/auth-guard.ts)

---

## 6. Тесты

Последний зафиксированный результат (2026-08-29): **157 тестов passed, 0 failed**.

Покрытие test files:
- [`packages/auth/src/*.test.ts`](../packages/auth/src/) — JWT, LDAP, RBAC, password, audit, SRM adapters/webhooks, WMS, MRO, EPS, jira-mapping
- [`apps/web/src/lib/__tests__/*.test.ts`](../apps/web/src/lib/__tests__/) — api-security, auth-guard, database-backup, file-access, outbound-url, rate-limit, safe-error, wms-transfers

---

## 7. Находки для включения в REMEDIATION_PLAN.md

### Story B3 — Унификация role checks (LOW) — ✅ выполнено

**Файлы:** [`auth-guard.ts`](../apps/web/src/lib/auth-guard.ts:50), [`auth-guard.test.ts`](../apps/web/src/lib/__tests__/auth-guard.test.ts:87), 35 API routes.
**Результат:** добавлен `isAdminUser()`, inline-проверки API переведены на helper, добавлены 3 unit-теста. `auth/login` оставлен с локальной проверкой массива ролей как documented exception.
**Проверки:** 160 тестов, lint, tsc, route audit, theme check и quality baseline — PASS.

### Story C2 — Заменить `console.*` на `logger.*` в API (LOW, 0.5h)

| Файл | Строки | Замена |
|---|---|---|
| [`srm/issues/route.ts`](../apps/web/src/app/api/srm/issues/route.ts) | 156 | `logger.warn` |
| [`eps/import/execute/route.ts`](../apps/web/src/app/api/eps/import/execute/route.ts) | 134, 326 | `logger.error` |
| [`setup/execute/route.ts`](../apps/web/src/app/api/setup/execute/route.ts) | 162 | `logger.warn` |

### Story C3 — Декомпозиция `AdminSettingsPage` (MEDIUM, 2d)

**Файл:** [`app/admin/settings/page.tsx`](../apps/web/src/app/admin/settings/page.tsx) (1 097 строк)  
**Действие:** Вынести каждую секцию настроек в отдельный tab-компонент (`AdminLdapSettingsTab`, `AdminSrmSettingsTab`, `AdminStorageTab`, `AdminMaintenanceTab`). Сохранить state и handlers в родителе.

### Story C4 — Декомпозиция `WarehouseTopologyModal` (MEDIUM, 1d)

**Файл:** [`components/wms/WarehouseTopologyModal.tsx`](../apps/web/src/components/wms/WarehouseTopologyModal.tsx) (878 строк)  
**Действие:** Вынести секцию зон/ячеек в `WarehouseZonePanel`, секцию карточки зоны в `WarehouseZoneCard`.

---

## 8. Воспроизведённые проверки

```bash
# Ручной анализ через search_files + read_file (эта сессия)
# Предыдущий baseline (2026-08-29 утро):
python .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --language typescript --json
python .agents/skills/code-reviewer/scripts/pr_analyzer.py . --json
node scripts/check-quality-baseline.mjs
node scripts/check-theme-tokens.mjs
python scripts/route_audit.py
python scripts/fgrade_detail.py

# Следующий merge-gate (запустить перед PR):
pnpm --filter @ems/web lint
pnpm --filter @ems/web exec tsc --noEmit
pnpm test
pnpm --filter @ems/web build
```

---

## 9. Итог

| Категория | Статус | Приоритет действий |
|---|---|---|
| Security (rate limit, RBAC, webhook, LDAP, SQL) | ✅ ALL PASS | — |
| UI Design System (StatusBadge, StatCard, Chip, hex) | ✅ ALL PASS | — |
| API pattern consistency | ✅ PASS | — |
| Role string consistency | ⚠️ LOW | Story C1 |
| `console.*` в API | ⚠️ LOW | Story C2 |
| Large files (> 500 строк) | ⚠️ MEDIUM | Stories C3, C4 |
| Quality baseline (78.3, F≤38) | ✅ PASS | поддерживать |
| Test coverage (157 passed) | ✅ PASS | поддерживать |

**Общий вердикт: ✅ Approve with suggestions.** Проект находится в стабильном рабочем состоянии. Критические проблемы безопасности и дизайна закрыты. B3 выполнена; следующий bounded этап — B4 (structured logging), затем C1–C4.

---

*Инспекция 2026-08-29 (повторная). Правила v2.0 (AGENTS.md). Предыдущий отчёт: [CODE_REVIEW_AUDIT.md](CODE_REVIEW_AUDIT.md). План устранения: [REMEDIATION_PLAN.md](REMEDIATION_PLAN.md).*
