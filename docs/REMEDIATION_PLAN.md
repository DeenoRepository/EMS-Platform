# EMS-Platform — план устранения замечаний инспекции

**Дата плана:** 2026-08-29  
**Источник:** [`docs/PROJECT_INSPECTION.md`](PROJECT_INSPECTION.md)  
**Правила:** [`AGENTS.md`](../AGENTS.md), [`.agents/rules/security.md`](../.agents/rules/security.md), [`.agents/rules/code_quality.md`](../.agents/rules/code_quality.md), [`.agents/rules/ui_design_code.md`](../.agents/rules/ui_design_code.md)  
**Скиллы по story:** `senior-security` / `senior-secops` (S*), `senior-backend` + `strict-api` (API), `senior-frontend` (UI-декомпозиция), `senior-qa` (тесты), `code-reviewer` (quality gate).

> **Цель:** закрыть остаточный долг без массового переписывания. Каждая story — один Conventional Commit, без смены API contract, без массовой замены `magic_number`.

---

## 0. Правила выполнения для агентов

1. Одна story = один PR/коммит. Не смешивать security, logging и UI-декомпозицию.
2. Перед кодом: прочитать затронутые файлы целиком (или semantic block), не выдумывать API.
3. Shared UI только из `@/components/ui`. Hex в `sx` запрещён. Статусы — только `StatusBadge`.
4. После каждой story:
   ```bash
   pnpm --filter @ems/web lint
   pnpm --filter @ems/web exec tsc --noEmit
   ```
   Security/API: дополнительно `pnpm test` и `python scripts/route_audit.py`.  
   Декомпозиция F-файлов: `python scripts/fgrade_detail.py` + `node scripts/check-quality-baseline.mjs`.
5. Quality checker **не** является единственным источником истины для TSX: проверять реальные границы функций вручную.
6. Не трогать `temp/`, `.env`, `uploads/`, `docker/jira/server.js` без отдельной задачи.
7. Не массово выносить 1911 `magic_number`. Именовать только domain constants (лимиты, timeouts, статусы).

**Текущий baseline (не ухудшать):**

| Метрика | Сейчас | Не хуже чем |
|---|---:|---:|
| web average | 78.3 | 78.0 |
| web F-grade | 38 | 38, цель < 38 |
| web smells | 2353 | 2400 |
| web SOLID | 25 | 25 |
| packages average | 94.1 | 94.0 |
| packages F-grade | 0 | 0 |

---

## Фаза A — Security и конфигурация (сначала)

### Story A1 — Убрать demo-секреты из шаблонов (S2, S3) — ✅ выполнено

**Статус:** завершено 2026-08-29; regression suite, lint, TypeScript, route audit и quality baseline прошли.
**Приоритет:** P1 / Low–Medium
**Скиллы:** `senior-security`, `senior-backend`  
**Оценка:** 0.5 дня

**Проблема:** [`.env.example`](../.env.example:81) содержит `JIRA_API_TOKEN=adminpassword`. [`validateEnv()`](../apps/web/src/lib/env-validate.ts:105) для LDAP запрещает только `password`/`changeme`, не `adminpassword`.

**Шаги:**

1. В `.env.example` заменить `JIRA_API_TOKEN=adminpassword` на `REPLACE_WITH_JIRA_TOKEN` (как остальные секреты).
2. Проверить `.env.production.example` и `docs/JIRA_SRM_SETUP.md` на те же литералы; заменить только шаблонные значения, не live-инструкции с пометкой «пример».
3. В `DANGEROUS_DEFAULTS` / LDAP `forbiddenValues` добавить `adminpassword`.
4. Расширить тест в [`apps/web/src/lib/__tests__/api-security.test.ts`](../apps/web/src/lib/__tests__/api-security.test.ts): example не содержит `adminpassword` как значение токена; `validateEnv({ force: true })` падает на LDAP `adminpassword` при `LDAP_ENABLED=true`.

**Не делать:** менять локальный `.env` пользователя; ломать local-dev compose (это A3).

**DoD:**

- [x] `.env.example` использует `REPLACE_WITH_JIRA_TOKEN`.
- [x] LDAP bind/admin password проверяются по `DANGEROUS_DEFAULTS`.
- [x] Regression-тесты для template и `validateEnv(true)` добавлены.
- [x] `pnpm test`: 153 passed; lint/tsc/route audit/quality baseline PASS.
- Коммит: `fix(security): remove demo Jira token from env examples and block LDAP default password`

---

### Story A2 — Политика webhook secret (S4) — ✅ выполнено

**Статус:** завершено 2026-08-29; runtime policy, integration CRUD validation, secret masking, regression suite, lint, TypeScript, full tests и route audit прошли.
**Приоритет:** P1 / Medium
**Скиллы:** `senior-security`, `senior-backend`, `strict-api`, `jira-expert`  
**Оценка:** 1 день

**Проблема:** если у интеграции нет `webhookSecret` / `apiToken` / `apiKey` / `token`, [`POST /api/srm/webhooks/[id]`](../apps/web/src/app/api/srm/webhooks/[id]/route.ts:53) принимает inbound без аутентификации.

**Решение (предпочтительное):** fail-closed для активных интеграций.

1. При создании/обновлении интеграции (`/api/srm/integrations`) требовать секрет, если `isActive === true`.
2. В webhook handler: если интеграция активна и секрета нет — `401` + audit log, не обрабатывать payload.
3. Опциональный явный opt-in только если продукт это требует: `authConfig.allowUnsignedWebhooks === true`. По умолчанию `false`. Документировать риск в `docs/JIRA_SRM_SETUP.md`.
4. Тесты:
   - нет секрета + active → 401;
   - секрет задан, токен отсутствует → 401 (уже есть паттерн);
   - секрет задан, токен верный → 2xx path (mock prisma);
   - если opt-in оставлен: unsigned проходит только при флаге.
5. Не ломать существующий fail-closed паттерн `!providedToken || providedToken !== webhookSecret`.

**DoD:**

- [x] Active unsigned integrations return 401 unless `allowUnsignedWebhooks === true`.
- [x] Create/update routes reject active integrations without secure webhook auth.
- [x] Configured secret still requires a matching token.
- [x] Webhook secrets are masked and preserved through sanitized PUT payloads.
- [x] `pnpm test`: 156 passed; lint/tsc/route audit PASS.
- Коммит: `fix(security): reject unsigned SRM webhooks unless explicitly allowed`

---

### Story A3 — Dev compose не маскируется под production (S1) — ✅ выполнено

**Статус:** завершено 2026-08-29; local compose явно отделён от production, требует `.env` variables и использует `NODE_ENV=development`.
**Приоритет:** P2 / Medium
**Скиллы:** `docker-development`, `senior-security`  
**Оценка:** 0.5–1 день

**Проблема:** [`docker-compose.yml`](../docker-compose.yml) задаёт fallback `postgrespassword`, `adminpassword`, статический JWT и `NODE_ENV=production`. Prod-файл уже строгий.

**Шаги:**

1. В шапке `docker-compose.yml` явно написать: **local development only; не использовать для prod**.
2. Сменить `NODE_ENV` dev-стека на `development` **или** оставить production-build, но убрать JWT/password fallbacks и требовать `.env` (`:?` syntax), как в prod. Предпочтение: требовать `.env`, сохранить удобный local path через `.env.example` placeholders.
3. Не ломать `install.ps1` / `install.sh` / `docker-compose.offline.yml`. Прогнать чтение скриптов установки.
4. Тест `production compose templates require secrets` не должен начать требовать то же от dev compose, если dev остаётся с demo — тогда тест явно разделяет `docker-compose.yml` (dev) vs `docker-compose.prod.yml`.

**DoD:**

- [x] `docker-compose.yml` помечен LOCAL DEVELOPMENT ONLY и использует `NODE_ENV=development`.
- [x] Dev compose требует `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`, LDAP passwords без plaintext fallback.
- [x] Prod/offline compose без plaintext fallback JWT/password.
- [x] Установщики обозначают основной compose как local dev; production guide указывает только `docker-compose.prod.yml` / `docker-compose.offline.yml`.
- [x] Compose config validation и security regression test проходят.
- Коммит: `fix(security): stop shipping production NODE_ENV with default secrets in dev compose`

---

## Фаза B — Наблюдаемость и async-дисциплина

### Story B1 — Structured logging вместо `console.error` (S5 + §6 инспекции) — ✅ выполнено для bounded списка

**Статус:** завершено 2026-08-29; подтверждённые API best-effort и UI loading paths переведены на structured logging/snackbar. Остальные legacy `console.error` вне bounded списка оставлены отдельным долгом.
**Последующие batches:** MRO API checklists/plans/schedules (7 raw logs) и WMS core collection routes (categories, nomenclature, warehouses, operations; 7 raw logs) переведены на structured `logger.error` отдельными коммитами.
**Приоритет:** P2
**Скиллы:** `senior-backend`, `senior-frontend`  
**Оценка:** 1 день

**Файлы (подтверждённый список):**

| Слой | Файл |
|---|---|
| API | [`apps/web/src/app/api/auth/login/route.ts`](../apps/web/src/app/api/auth/login/route.ts:49) |
| API | [`apps/web/src/app/api/notifications/route.ts`](../apps/web/src/app/api/notifications/route.ts:37) |
| API best-effort | [`apps/web/src/app/api/wms/transfers/route.ts`](../apps/web/src/app/api/wms/transfers/route.ts), `dispatch` / `reject` / `receive` |
| UI | [`MroExecutionWizardDialog.tsx`](../apps/web/src/components/mro/MroExecutionWizardDialog.tsx), [`ApprovalWizardDialog.tsx`](../apps/web/src/components/eps/ApprovalWizardDialog.tsx), [`TransferRequestDialog.tsx`](../apps/web/src/components/wms/TransferRequestDialog.tsx), [`TransferReceiveDialog.tsx`](../apps/web/src/components/wms/TransferReceiveDialog.tsx), [`StockDetailDrawer.tsx`](../apps/web/src/components/wms/StockDetailDrawer.tsx), [`CreateNomenclatureDialog.tsx`](../apps/web/src/components/wms/CreateNomenclatureDialog.tsx), [`EditNomenclatureDialog.tsx`](../apps/web/src/components/wms/EditNomenclatureDialog.tsx) |

**Шаги:**

1. Сервер: `logger.error(...)` с correlation/entity context; не логировать пароли.
2. Best-effort notification `.catch`: `logger.warn` + комментарий `best-effort`, не ронять основной ответ.
3. UI: `.catch` → setError/snackbar + `logger` только если есть клиентский logger; иначе локальный error state. Пользователь должен видеть сбой загрузки справочников.
4. `DataTableWrapper` empty catch вокруг `localStorage`: оставить guard, добавить `logger.debug` или комментарий `private-mode / quota`.
5. Не вводить новый logging framework.

**DoD:**

- [x] Login LDAP errors идут в `logger`.
- [x] WMS transfer notification failures используют `logger.warn` и сохраняют best-effort semantics.
- [x] Bounded UI dictionary/history failures показывают snackbar/error feedback.
- [x] `pnpm test`: 156 passed; lint/tsc/route audit/quality baseline PASS.
- [x] MRO API batch (checklists, plans, schedules) переведён на `logger.error` с endpoint context.
- [x] WMS core collection batch (categories, nomenclature, warehouses, operations) переведён на `logger.error` с endpoint context.
- [ ] Полная миграция оставшихся legacy `console.error` в `apps/web/src` — отдельные bounded batches.
- Коммиты: `refactor: replace console.error catch paths with logger and UI errors`; MRO/WMS batches — отдельные Conventional Commits.

---

### Story B2 — StatusBadge в паспорте оборудования (UI-1) — ✅ выполнено

**Статус:** завершено 2026-08-29; entity-status использует shared `StatusBadge`, metadata Chips сохранены.
**Приоритет:** P2 / Low
**Скиллы:** `senior-frontend`
**Оценка:** 0.5 часа

**Проблема:** [`EquipmentPassportOverview.tsx`](../apps/web/src/components/eps/EquipmentPassportOverview.tsx:285) показывает «Текущий статус» через `<Chip label={statusInfo.label} />`. Это статус сущности — запрещено [`.agents/rules/ui_design_code.md`](../.agents/rules/ui_design_code.md). Эталон: [`ApprovalWizardDialog.tsx`](../apps/web/src/components/eps/ApprovalWizardDialog.tsx:214).

**Шаги:**

1. Импортировать `StatusBadge` из `@/components/ui`.
2. Заменить Chip на `<StatusBadge status={equipment.status} />`.
3. Убрать неиспользуемый `Chip` из MUI-импорта, если больше не нужен (теги оборудования Chip оставляют).
4. Не трогать `HealthScoreGauge` / `StatCard`.

**DoD:**

- [x] В паспорте статус оборудования только через `StatusBadge`.
- [x] Metadata Chips оборудования сохранены.
- [x] `pnpm --filter @ems/web lint` + `tsc --noEmit`; theme check, 156 tests и quality baseline PASS.
- Коммит: `fix(ui): use StatusBadge for equipment status in passport overview`

---

## Фаза C — Снижение F-grade (качество, без смены поведения)

Цель фазы: **F-grade web < 38**, average не ниже 78.0, SOLID ≤ 25.  
Порядок — по размеру × доменной чувствительности. **Один файл / один кластер на коммит.**

Общий рецепт декомпозиции:

1. Зафиксировать public props и callbacks.
2. Вынести pure mapping/validation в `*.ts` рядом.
3. Вынести presentation (tabs, dialogs, tables) в соседние компоненты.
4. State/fetching оставить в route owner, как уже сделано для WMS operation wizard.
5. Не менять URL, payload, Prisma queries.
6. RTL/smoke: открытие диалога, submit validation, empty state.
7. После: quality checker по файлу + baseline.

### Story C1 — Admin settings page (1097 строк)

**Файл:** [`apps/web/src/app/admin/settings/page.tsx`](../apps/web/src/app/admin/settings/page.tsx)  
**Скиллы:** `senior-frontend`  
**Оценка:** 1–1.5 дня

Вынести: LDAP test panel, SRM test panel, dump download, maintenance toggles → `components/admin/settings/*`.  
Handlers `handleDownloadDump`, `handleTestSrm`, `handleTestLdap` — отдельные modules.  
Страница остаётся оркестратором.

Коммит: `refactor(admin): split settings page into focused panels`

### Story C2 — Warehouse topology modal (927 строк, cx 12.7)

**Файл:** [`apps/web/src/components/wms/WarehouseTopologyModal.tsx`](../apps/web/src/components/wms/WarehouseTopologyModal.tsx)  
**Скиллы:** `senior-frontend`, `senior-backend` (cell CRUD invariants)  
**Оценка:** 1.5 дня

Вынести: zone list, cell grid, batch generate, delete confirm.  
Особо проверить rollback при ошибке `handleDeleteCell` / `handleBatchGenerate`.  
Не менять API зон/ячеек.

Коммит: `refactor(wms): decompose warehouse topology modal`

### Story C3 — WMS stock page (905 строк)

**Файл:** [`apps/web/src/app/wms/stock/page.tsx`](../apps/web/src/app/wms/stock/page.tsx)  
**Скиллы:** `senior-frontend`  
**Оценка:** 1 день

Вынести: filter model, sort handler, zone loader, table section.  
Использовать `FilterToolbar`, `SearchInput`, `DataTableWrapper`, `EmptyState`.

Коммит: `refactor(wms): extract stock page data and filter model`

### Story C4 — Equipment wizard form (843 строк)

**Файл:** [`apps/web/src/components/eps/EquipmentWizardForm.tsx`](../apps/web/src/components/eps/EquipmentWizardForm.tsx)  
**Скиллы:** `senior-frontend`  
**Оценка:** 1.5 дня

Вынести: `renderFieldInput` → field renderer map; `handleSave` validation → pure function.  
Не дублировать `CustomFieldValueRenderer`.

Коммит: `refactor(eps): split equipment wizard field rendering and save`

### Story C5 — EPS reports (842) + Smart import (820)

**Оценка:** 2 дня, **два коммита**

- Reports: column builder / export JSON уже частично в `components/eps/reports/` — донести остаток `ReportBuilderContent`.
- Import: `handleAnalyzeFile` / `handleExecuteImport` в service helpers рядом с [`eps-import-helpers.ts`](../apps/web/src/lib/eps-import-helpers.ts). Добавить fixture test на collision/error counts.

Коммиты:

- `refactor(eps): extract report builder content from page`
- `refactor(eps): extract smart import analyze/execute handlers`

### Story C6 — Остальные P1 страницы > 600 строк

По одному коммиту, тот же рецепт:

| Порядок | Файл | Фокус |
|---|---|---|
| 1 | [`wms/inventory/page.tsx`](../apps/web/src/app/wms/inventory/page.tsx) | filters |
| 2 | [`eps/[id]/page.tsx`](../apps/web/src/app/eps/[id]/page.tsx) | passport content already has tabs — вынести handlers copy/delete |
| 3 | [`wms/warehouses/page.tsx`](../apps/web/src/app/wms/warehouses/page.tsx) | submit complexity 18 |
| 4 | [`srm/page.tsx`](../apps/web/src/app/srm/page.tsx) | details drawer vs page |
| 5 | [`setup/page.tsx`](../apps/web/src/app/setup/page.tsx) | execute/LDAP — steps уже есть, ужать owner |
| 6 | [`Sidebar.tsx`](../apps/web/src/components/layout/Sidebar.tsx) | **осторожно**: предыдущая extraction откатывалась |
| 7 | [`wms/page.tsx`](../apps/web/src/app/wms/page.tsx) | DeficitItem, fetchStats |
| 8 | [`MroExecutionWizardDialog.tsx`](../apps/web/src/components/mro/MroExecutionWizardDialog.tsx) | вместе с B1, если ещё не разнесён |
| 9 | [`login/page.tsx`](../apps/web/src/app/login/page.tsx) | performLogin |
| 10 | [`wms/operations/page.tsx`](../apps/web/src/app/wms/operations/page.tsx) | quick dispatch |
| 11 | [`admin/feedback/page.tsx`](../apps/web/src/app/admin/feedback/page.tsx) | filters |
| 12 | [`WmsOperationWizardDialog.tsx`](../apps/web/src/components/wms/WmsOperationWizardDialog.tsx) + ItemsStep | wizard 174 |
| 13 | [`EquipmentTableView.tsx`](../apps/web/src/components/eps/EquipmentTableView.tsx) | snapshot consumers first |
| 14 | [`admin/audit-log/page.tsx`](../apps/web/src/app/admin/audit-log/page.tsx) | `sortAuditLogs` cx 22 → already extracted? split comparators |

**Sidebar:** если extraction ломает collapsed flyout / permission gating — **стоп и откат**, как в аудите 2026-08-27.

### Story C7 — P2 F-файлы < 500 строк

Не рефакторить `theme.ts` ради score: это false F (0 functions). Зафиксировать исключение в `check-quality-baseline.mjs` **только если** появится allowlist; иначе оставить как известный parser false-positive.

Реальные: `StockDetailDrawer` (cx 20), `TransferRequestDialog` (cx 20), `EquipmentOperationalTabs`, `EquipmentPassportOverview` — вынести sub-tabs (уже частично есть).

---

## Фаза D — Типизация (не смешивать с C)

**Приоритет:** P2  
**Скиллы:** `strict-api`, `senior-backend`

1. Внешние JSON boundaries: `unknown` + type guard / Zod (login уже на Zod).
2. Приоритет: `apps/web/src/lib/srm-providers`, `apps/web/src/lib/jira`, WMS/EPS API bodies.
3. Удалять `as any` только в том же файле, что и schema. Не по всему репозиторию.

Коммит-шаблон: `refactor(srm): type webhook payload as unknown and narrow`

---

## Фаза E — Tooling и документация (параллельно, низкий риск)

1. Обновить §3 в [`.agents/rules/code_quality.md`](../.agents/rules/code_quality.md): таблица F-файлов 2026-08-27 устарела (`jira-service.ts` уже разделён). Заменить актуальным списком из инспекции.
2. `code_quality.md` §2 всё ещё предлагает писать JSON в `docs/code-review-report.json` — согласовать с in-memory `pnpm check:quality`.
3. Не коммитить `quality-web.json` / `quality-packages.json`.

Коммит: `docs: align code quality rules with 2026-08-29 F-grade list`

---

## Вне скоупа (явно не делать)

- Массовая замена magic numbers и Chip→StatusBadge для metadata.
- Удаление `docker/jira/server.js`, `scripts/update_feedback_schema.sql`, `temp/`.
- Смена baseline smells вниз без фактического снижения (сейчас 2353 ≤ 2400 — ок).
- Горизонтальный Redis rate-limit — отдельный infra epic, не этот план.
- Повторный полный lint/tsc/build в каждой UI-story, если затронут только один presentation-файл — достаточно targeted; полный suite обязателен на A2 и на каждом merge в main.

---

## Расписание (рекомендуемое)

| Неделя | Stories | Результат |
|---|---|---|
| 1 | A1, A2, A3, B1 | security residual закрыт, logging единообразен |
| 2 | C1, C2, C3 | 3 крупнейших UI-монолита |
| 3 | C4, C5 | EPS wizard + import/report |
| 4 | C6 (4–6 файлов) | F-grade < 38 |
| backlog | C7, D, E | parser false-positives, typing, rules sync |

---

## Definition of Done всего плана

- [ ] A1–A3 закрыты тестами
- [ ] Unsigned webhook не принимается по умолчанию
- [ ] `.env.example` без demo Jira token
- [ ] Нет `.catch(console.error)` в apps/web production paths
- [ ] Web F-grade < 38, baseline PASS
- [ ] `pnpm check:quality`, `check:theme`, `route_audit.py`, `pnpm test` зелёные
- [ ] [`PROJECT_INSPECTION.md`](PROJECT_INSPECTION.md) §8 чеклист обновлён

---

*План для следующих агентов. Не начинать C-story, пока A2 не в main, если работаете на том же webhook-файле.*
