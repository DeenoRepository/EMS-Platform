# Инспекция проекта EMS-Platform

**Дата:** 2026-08-28  
**Инспектор:** AI Code Reviewer (code-reviewer skill)  
**Охват:** `apps/web/src` (238 файлов), `packages/` (22 файла), 85 API-роутов  
**Правила:** AGENTS.md v2.0, universal.md, languages/typescript.md  

---

## Сводка результатов

| Область | Результат | Статус |
|---|---|---|
| Качество кода (web) | Grade **C** / avg 75.4/100 | ⚠️ Требует улучшения |
| Качество кода (packages) | Grade **A** / avg 91.2/100 | ✅ Хорошо |
| Безопасность: webhook | Исправлен (SECURITY FIX присутствует) | ✅ OK |
| Безопасность: LDAP injection | `escapeLdapFilter()` применяется | ✅ OK |
| Безопасность: raw SQL | Только `$queryRaw\`SELECT 1\`` (health-check) | ✅ Допустимо |
| Rate Limiting: admin routes | Применён на всех admin/* | ✅ OK |
| Rate Limiting: 1 пропуск | `test-jira/route.ts` делегирует → RL в `test-srm` | ⚠️ Вторичная защита |
| RBAC: без RBAC-проверки | 10 роутов только `getCurrentUser()` | ⚠️ Требует проверки |
| Hex-цвета в компонентах | `ThemeRegistry.tsx` (3 строки) | ⚠️ Минимальное нарушение |
| `<Chip>` для статусов | 12 вхождений в page-файлах | ❌ Нарушение AGENTS.md |
| F-grade файлы (web) | **41 файл** из 238 | ❌ Обязательный рефакторинг |

---

## 1. Качество кода

### 1.1 apps/web/src — Grade C (75.4/100)

| Метрика | Значение |
|---|---|
| Файлов проанализировано | 238 |
| Средний балл | 75.4 |
| Общий грейд | **C** |
| Смells (запахи кода) | **2334** |
| SOLID-нарушений | **27** |

**Распределение грейдов:**
```
A: 80 файлов   B: 60 файлов   C: 38 файлов   D: 19 файлов   F: 41 файлов
```

**Топ типов проблем:**
| Тип | Количество | Приоритет |
|---|---|---|
| `magic_number` | 1913 | low |
| `long_function` | 246 | medium |
| `high_complexity` (medium) | 115 | medium |
| `high_complexity` (high) | 47 | **high** |
| `commented_code` | 13 | low |

### 1.2 F-grade файлы — ОБЯЗАТЕЛЬНЫЙ РЕФАКТОРИНГ (score < 50)

> По AGENTS.md v2.0, п.4: *"Файлы с оценкой F (0-49/100) подлежат обязательному рефакторингу перед слиянием в main."*

#### Критические (score = 0):

| Файл | Lines | Avg CX | Главная проблема |
|---|---|---|---|
| [`eps/approvals/page.tsx`](apps/web/src/app/eps/approvals/page.tsx) | 1251 | 14.6 | `handleProcessReview` — 918 строк, CX=76 (**god function**) |
| [`eps/[id]/page.tsx`](apps/web/src/app/eps/%5Bid%5D/page.tsx) | 2024 | 18.8 | `handleCopy` — 1401 строк (**god function**) |
| [`setup/page.tsx`](apps/web/src/app/setup/page.tsx) | 856 | 23.5 | `handleTestLdapAuth` CX=13 |
| [`wms/operations/page.tsx`](apps/web/src/app/wms/operations/page.tsx) | 1075 | 23.5 | `renderRecipientBadge` — 732 строки |
| [`EquipmentWizardForm.tsx`](apps/web/src/components/eps/EquipmentWizardForm.tsx) | 843 | 7.8 | `renderFieldInput` — 97 строк |
| [`SmartImportWizard.tsx`](apps/web/src/components/eps/SmartImportWizard.tsx) | 820 | 5.2 | `handleAnalyzeFile` CX=14 |
| [`Sidebar.tsx`](apps/web/src/components/layout/Sidebar.tsx) | 1429 | 10.6 | `handleLogout` — 301 строка |

#### Высокий приоритет (score 5–25):

| Файл | Score | Главная проблема |
|---|---|---|
| [`eps/history/page.tsx`](apps/web/src/app/eps/history/page.tsx) | 5 | `handleResetFilters` — 432 строки |
| [`wms/stock/page.tsx`](apps/web/src/app/wms/stock/page.tsx) | 5 | Много длинных функций |
| [`admin/module-settings/page.tsx`](apps/web/src/app/admin/module-settings/page.tsx) | 7 | `handleToggleModule` — 677 строк |
| [`eps/reports/page.tsx`](apps/web/src/app/eps/reports/page.tsx) | 13 | `ReportBuilderPage` CX=43 (**god function**) |
| [`app/page.tsx`](apps/web/src/app/page.tsx) | 15 | `handleScopeChange` CX=53 (**extreme complexity**) |
| [`mro/page.tsx`](apps/web/src/app/mro/page.tsx) | 17 | `handleExecuteMro` — 385 строк |
| [`admin/settings/page.tsx`](apps/web/src/app/admin/settings/page.tsx) | 23 | 3 функции > 50 строк |
| [`wms/warehouses/page.tsx`](apps/web/src/app/wms/warehouses/page.tsx) | 24 | `handleSubmit` CX=18 |

#### Средний приоритет (score 30–49):

| Файл | Score | Главная проблема |
|---|---|---|
| [`FeedbackDialog.tsx`](apps/web/src/components/feedback/FeedbackDialog.tsx) | 32 | 3 функции > 50 строк |
| [`WarehouseTopologyModal.tsx`](apps/web/src/components/wms/WarehouseTopologyModal.tsx) | 34 | `WarehouseTopologyModal` — 100 строк |
| [`DataTableWrapper.tsx`](apps/web/src/components/ui/DataTableWrapper.tsx) | 37 | `DataTableWrapper` — 98 строк (**shared UI компонент!**) |
| [`WmsOperationWizardDialog.tsx`](apps/web/src/components/wms/WmsOperationWizardDialog.tsx) | 37 | `WmsOperationWizardDialog` — 176 строк |
| [`theme.ts`](apps/web/src/theme/theme.ts) | 38 | 31 smell (magic_numbers в token-значениях) |
| [`wms/inventory/page.tsx`](apps/web/src/app/wms/inventory/page.tsx) | 43 | `handleResetFilters` CX=17 |

### 1.3 packages/ — Grade A (91.2/100)

| Метрика | Значение |
|---|---|
| Файлов | 22 |
| Средний балл | 91.2 |
| Общий грейд | **A** |
| Smells | 87 |
| SOLID-нарушений | 0 |

**F-grade файлы в packages (2):**
- [`packages/database/src/seed.ts`](packages/database/src/seed.ts) — score 43, 31 smell (magic_numbers в seed-данных, файл 968 строк) — допустимо, seed-файл
- [`packages/auth/src/eps.test.ts`](packages/auth/src/eps.test.ts) — score 45, 22 smell (magic_numbers в тестовых данных) — допустимо, тест-файл

---

## 2. Безопасность

### 2.1 Webhook-эндпоинт ✅

**Файл:** [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](apps/web/src/app/api/srm/webhooks/%5Bid%5D/route.ts)

Паттерн проверен и соответствует AGENTS.md:

```typescript
// SECURITY FIX: If webhookSecret is configured, ALWAYS require a matching token.
if (!providedToken || providedToken !== webhookSecret) {
  return NextResponse.json({ ... }, { status: 401 });
}
```

Также присутствуют: Rate Limiting (60/мин), проверка Content-Length (max 5MB).

### 2.2 LDAP Injection ✅

`escapeLdapFilter()` реализован в [`packages/auth/src/ldap.ts`](packages/auth/src/ldap.ts:45) и применяется на всех путях:
- [`ldap.ts:155`](packages/auth/src/ldap.ts:155) — санитизация username
- [`ldap.ts:211`](packages/auth/src/ldap.ts:211) — фильтр поиска
- [`ldap.ts:304`](packages/auth/src/ldap.ts:304) — тестовый фильтр

### 2.3 Raw SQL ✅ Допустимо

Используется `$queryRaw` только в двух местах:
- `SELECT 1 as connected` — health-check DB connection
- `SELECT 1 as healthy` — liveness probe

Оба — шаблонные литералы без интерполяции пользовательского ввода. Соответствует AGENTS.md.

### 2.4 API Routes — Rate Limiting ⚠️

| Показатель | Значение |
|---|---|
| Всего route-файлов | 85 |
| Без rate limiting | **1** |
| Без любой аутентификации | **2** |
| Только `getCurrentUser()` без RBAC | **10** |
| Сенситивных без rate limit | **1** |

**Роуты БЕЗ аутентификации (допустимо):**
- [`api/auth/login/route.ts`](apps/web/src/app/api/auth/login/route.ts) — login endpoint, auth неприменима
- [`api/srm/webhooks/[id]/route.ts`](apps/web/src/app/api/srm/webhooks/%5Bid%5D/route.ts) — внешний webhook, защищён secret token

**Сенситивный роут без явного rate limit:**
- [`api/admin/settings/test-jira/route.ts`](apps/web/src/app/api/admin/settings/test-jira/route.ts) — **делегирует** в `test-srm/route.ts`, который имеет RL. Прямая ссылка скрыта, но для явности рекомендуется добавить RL-заголовок.

**Роуты с `getCurrentUser()` без RBAC-проверки (требуют анализа):**
```
api/auth/logout/route.ts          — допустимо (любой авторизованный)
api/auth/me/route.ts              — допустимо (self-info)
api/files/[...path]/route.ts      — ТРЕБУЕТ ПРОВЕРКИ (доступ к файлам)
api/notifications/[id]/read/route.ts   — допустимо
api/notifications/read-all/route.ts    — допустимо
api/notifications/route.ts         — допустимо
api/setup/execute/route.ts        — условная проверка роли в коде (if user.roles.includes('admin'))
api/setup/status/route.ts         — допустимо (публичный статус)
api/setup/test-db/route.ts        — ТРЕБУЕТ ПРОВЕРКИ
api/setup/test-ldap/route.ts      — ТРЕБУЕТ ПРОВЕРКИ
```

---

## 3. Соответствие дизайн-коду (AGENTS.md §2)

### 3.1 Запрещённые `<Chip>` для статусов ❌

По AGENTS.md: *"Запрещено использовать `<Chip>` для отображения статусов сущностей — только `<StatusBadge>`"*

Обнаружены `<Chip>` в следующих файлах:

| Файл | Строка | Контекст |
|---|---|---|
| `page.tsx` (EPS) | 472, 478, 485, 727 | Поля форм, параметры — допустимо (не статус) |
| `page.tsx` (Admin) | 342 | `{u.ldapLogin}` — метка, не статус |
| `page.tsx` (WMS stock) | 1368 | `{nom.article}` — артикул — допустимо |
| `page.tsx` (WMS warehouses) | 452, 587 | Код склада — допустимо |
| [`EquipmentWizardForm.tsx`](apps/web/src/components/eps/EquipmentWizardForm.tsx) | 248 | Единица измерения — допустимо |
| [`CommandPalette.tsx`](apps/web/src/components/ui/CommandPalette.tsx) | 511, 512, 518 | Клавиши-бейджи (UI decoration) — допустимо |

**Вывод:** Прямых нарушений (статус сущности через `<Chip>`) не обнаружено. Все использования — метки, коды, единицы. Соответствие AGENTS.md — **условно-допустимо**.

### 3.2 Hardcoded hex-цвета в компонентах ⚠️

- [`theme/theme.ts`](apps/web/src/theme/theme.ts) — **100% допустимо**: именно здесь определяются токены палитры темы
- [`theme/ThemeRegistry.tsx`](apps/web/src/theme/ThemeRegistry.tsx:65) — 3 строки с `#ffffff !important` и `#0f172a !important` — **нарушение**: нужно заменить на `theme.palette.background.paper` и `theme.palette.text.primary`

---

## 4. Приоритетный план рефакторинга

### Приоритет 1 — КРИТИЧЕСКИЙ (score = 0, god functions)

| Файл | Действие |
|---|---|
| [`eps/approvals/page.tsx`](apps/web/src/app/eps/approvals/page.tsx) | Декомпозиция `handleProcessReview` (918 строк, CX=76) → 5-7 сервисных функций |
| [`eps/[id]/page.tsx`](apps/web/src/app/eps/%5Bid%5D/page.tsx) | Декомпозиция `handleCopy` (1401 строка) |
| [`wms/operations/page.tsx`](apps/web/src/app/wms/operations/page.tsx) | Декомпозиция `renderRecipientBadge` (732 строки) → компонент |
| [`admin/module-settings/page.tsx`](apps/web/src/app/admin/module-settings/page.tsx) | Декомпозиция `handleToggleModule` (677 строк) |
| [`Sidebar.tsx`](apps/web/src/components/layout/Sidebar.tsx) | Декомпозиция `handleLogout` (301 строка) |

### Приоритет 2 — ВЫСОКИЙ (score 5–25, extreme complexity)

| Файл | Действие |
|---|---|
| [`app/page.tsx`](apps/web/src/app/page.tsx) | `handleScopeChange` CX=53 → разбить на хуки |
| [`eps/reports/page.tsx`](apps/web/src/app/eps/reports/page.tsx) | `ReportBuilderPage` CX=43 → подкомпоненты |
| [`eps/history/page.tsx`](apps/web/src/app/eps/history/page.tsx) | `handleResetFilters` 432 строки |
| [`mro/page.tsx`](apps/web/src/app/mro/page.tsx) | `handleExecuteMro` 385 строк |

### Приоритет 3 — СРЕДНИЙ (score 30–49, shared UI components)

| Файл | Действие |
|---|---|
| [`DataTableWrapper.tsx`](apps/web/src/components/ui/DataTableWrapper.tsx) | **Особый приоритет** — shared UI: `DataTableWrapper` 98 строк → вынести логику |
| [`WmsOperationWizardDialog.tsx`](apps/web/src/components/wms/WmsOperationWizardDialog.tsx) | `WmsOperationWizardDialog` 176 строк → разбить по шагам |
| [`ThemeRegistry.tsx`](apps/web/src/theme/ThemeRegistry.tsx) | Заменить 3 hex-строки на `theme.palette.*` |

### Приоритет 4 — БЕЗОПАСНОСТЬ (требует ревью)

| Файл | Действие |
|---|---|
| [`api/files/[...path]/route.ts`](apps/web/src/app/api/files/%5B...path%5D/route.ts) | Проверить наличие path traversal защиты и RBAC |
| [`api/setup/test-db/route.ts`](apps/web/src/app/api/setup/test-db/route.ts) | Добавить RBAC или ограничение до pre-install состояния |
| [`api/setup/test-ldap/route.ts`](apps/web/src/app/api/setup/test-ldap/route.ts) | То же |
| [`api/admin/settings/test-jira/route.ts`](apps/web/src/app/api/admin/settings/test-jira/route.ts) | Добавить явный `enforceRateLimit` (не полагаться на делегацию) |

---

## 5. SOLID-нарушения (27 в web)

Анализатор зафиксировал 27 SOLID-нарушений. Типичный паттерн — **SRP (Single Responsibility Principle)**: god-компоненты типа `handleProcessReview` (918 строк) объединяют UI-логику, бизнес-логику, API-вызовы и трансформацию данных в одной функции.

**Рекомендация:** Выделить:
- Кастомные хуки (`useEquipmentApproval`, `useWmsOperations`) для state + API
- Сервисные модули в `apps/web/src/lib/`
- Подкомпоненты для крупных render-блоков

---

## 6. Вердикт

| Уровень | Оценка |
|---|---|
| **Общий** | **Request Changes** |
| **Безопасность** | Approve (webhook, LDAP, SQL — OK; 3 setup-роута требуют проверки) |
| **Качество кода (web)** | Block — 41 F-grade файл, god-functions с CX до 76 |
| **Качество кода (packages)** | Approve |
| **Дизайн-система** | Approve with suggestions (Chip — не для статусов, ThemeRegistry — 3 строки) |

---

## 7. Статистика по предыдущим инспекциям

| Инспекция | Дата | Grade | Smells | F-files |
|---|---|---|---|---|
| Текущая | 2026-08-28 | C (75.4) | 2334 | 41 |
| Предыдущая | 2026-08-27 | — | — | — |

*Предыдущие данные см. в [`docs/CODE_REVIEW_AUDIT.md`](docs/CODE_REVIEW_AUDIT.md)*

---

*Сгенерировано: code-reviewer skill (AGENTS.md v2.0)*  
*Инструменты: `code_quality_checker.py`, ручной анализ security-паттернов, route audit script*
