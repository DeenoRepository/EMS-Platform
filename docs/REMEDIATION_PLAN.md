# EMS-Platform — план устранения замечаний инспекции

**Дата плана:** 2026-08-29 (обновлено по повторной инспекции 2026-08-29)
**Источник:** [`docs/PROJECT_INSPECTION.md`](PROJECT_INSPECTION.md), [`docs/CODE_REVIEW_AUDIT.md`](CODE_REVIEW_AUDIT.md)
**Правила:** [`AGENTS.md`](../AGENTS.md), [`.agents/rules/security.md`](../.agents/rules/security.md), [`.agents/rules/code_quality.md`](../.agents/rules/code_quality.md), [`.agents/rules/ui_design_code.md`](../.agents/rules/ui_design_code.md)
**Скиллы по story:** `senior-security` / `senior-secops` (S*), `senior-backend` + `strict-api` (API), `senior-frontend` (UI-декомпозиция), `senior-qa` (тесты), `code-reviewer` (quality gate).

> **Цель:** закрыть остаточный долг без массового переписывания. Каждая story — один Conventional Commit, без смены API contract, без массовой замены `magic_number`.

### Текущий прогресс по фазам

| Story | Статус | Приоритет |
|---|---|---|
| A1 — Demo secrets | ✅ Выполнено | P1 |
| A2 — Webhook secret policy | ✅ Выполнено | P1 |
| A3 — Dev compose | ✅ Выполнено | P2 |
| B1 — Structured logging (bounded) | ✅ Выполнено (bounded) | P2 |
| B2 — StatusBadge в паспорте | ✅ Выполнено | P2 |
| **B3 — Role string унификация** | ✅ Выполнено (2026-08-29) | LOW |
| **B4 — console.* остаток в API** | ✅ Выполнено (2026-08-29) | LOW |
| C1 — Admin settings page | ✅ Выполнено: C1.1–C1.4 | MEDIUM |
| C2 — Warehouse topology modal | ✅ Выполнено: C2.1–C2.3 | MEDIUM |
| C3 — WMS stock page | ✅ Выполнено: C3.1–C3.4 | MEDIUM |
| C4 — Equipment wizard form | ✅ Выполнено: C4.1–C4.3 | MEDIUM |
| C5 — EPS reports + import | ✅ Выполнено: C5.1–C5.4 | MEDIUM |
| C6 — P1 страницы > 600 строк | ⏳ В работе: C6.1 ✅; C6.2a ✅; C6.3 ✅; C6.5 ✅; C6.5 ✅ | MEDIUM |
| C7 — P2 F-файлы < 500 строк | ⏳ Открыта | LOW |
| D — Типизация | ⏳ В работе: D.1 ✅ (GitLab connection JSON boundary) | P2 |
| E — Tooling и документация | ⏳ Открыта | LOW |

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

## Фаза B — Наблюдаемость, async-дисциплина и микрофиксы

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

### Story B3 — Унификация проверки роли администратора ✅

**Статус:** завершена 2026-08-29; helper, API migration, regression tests и все обязательные проверки прошли.
**Приоритет:** LOW
**Скиллы:** `senior-backend`, `strict-api`
**Оценка:** 0.5 дня

**Проблема:** Инспекция 2026-08-29 выявила **37 мест** в 20+ API-маршрутах, где строка роли администратора проверяется несогласованно:

```typescript
// Вариант 1 — в WMS, EPS, Setup (9 файлов):
user.roles.includes('admin')

// Вариант 2 — в Feedback, Dashboard, Users (7 файлов):
user.roles?.includes('administrator')

// Вариант 3 — в Auth login (1 файл):
roles.includes('admin') || roles.includes('administrator')
```

**Риск:** Если в БД роль хранится как `'administrator'`, маршруты, проверяющие только `'admin'`, неверно откажут в доступе (и наоборот). Нестабильность в RBAC-логике.

**Шаги:**

1. В [`apps/web/src/lib/auth-guard.ts`](../apps/web/src/lib/auth-guard.ts) добавить хелпер:
   ```typescript
   /** Возвращает true если пользователь имеет роль admin или administrator */
   export function isAdminUser(user: JwtUserPayload): boolean {
     return user.roles.includes('admin') || user.roles.includes('administrator');
   }
   ```
2. Заменить все вхождения `user.roles.includes('admin')` и `user.roles?.includes('administrator')` на `isAdminUser(user)` в следующих файлах:
   - [`api/wms/zones/[id]/route.ts`](../apps/web/src/app/api/wms/zones/[id]/route.ts)
   - [`api/wms/operations/route.ts`](../apps/web/src/app/api/wms/operations/route.ts)
   - [`api/wms/categories/route.ts`](../apps/web/src/app/api/wms/categories/route.ts)
   - [`api/wms/stats/route.ts`](../apps/web/src/app/api/wms/stats/route.ts)
   - [`api/wms/transfers/route.ts`](../apps/web/src/app/api/wms/transfers/route.ts) (+ dispatch/receive/reject)
   - [`api/wms/warehouses/route.ts`](../apps/web/src/app/api/wms/warehouses/route.ts) (+ [id])
   - [`api/wms/warehouses/[id]/zones/route.ts`](../apps/web/src/app/api/wms/warehouses/[id]/zones/route.ts)
   - [`api/wms/zones/[id]/cells/route.ts`](../apps/web/src/app/api/wms/zones/[id]/cells/route.ts)
   - [`api/wms/stock/[id]/location/route.ts`](../apps/web/src/app/api/wms/stock/[id]/location/route.ts)
   - [`api/users/route.ts`](../apps/web/src/app/api/users/route.ts)
   - [`api/modules/status/route.ts`](../apps/web/src/app/api/modules/status/route.ts)
   - [`api/system/health/route.ts`](../apps/web/src/app/api/system/health/route.ts)
   - [`api/system/maintenance/route.ts`](../apps/web/src/app/api/system/maintenance/route.ts)
   - [`api/eps/approvals/route.ts`](../apps/web/src/app/api/eps/approvals/route.ts) (+ [id])
   - [`api/eps/documents/route.ts`](../apps/web/src/app/api/eps/documents/route.ts)
   - [`api/eps/history/route.ts`](../apps/web/src/app/api/eps/history/route.ts)
   - [`api/eps/reports/templates/route.ts`](../apps/web/src/app/api/eps/reports/templates/route.ts) (+ generate)
   - [`api/eps/equipment/route.ts`](../apps/web/src/app/api/eps/equipment/route.ts) (+ [id])
   - [`api/setup/test-db/route.ts`](../apps/web/src/app/api/setup/test-db/route.ts)
   - [`api/setup/test-ldap/route.ts`](../apps/web/src/app/api/setup/test-ldap/route.ts)
   - [`api/setup/status/route.ts`](../apps/web/src/app/api/setup/status/route.ts)
   - [`api/setup/execute/route.ts`](../apps/web/src/app/api/setup/execute/route.ts)
   - [`api/dashboard/stats/route.ts`](../apps/web/src/app/api/dashboard/stats/route.ts)
   - [`api/feedback/route.ts`](../apps/web/src/app/api/feedback/route.ts) (+ [id], comments, stats)
3. Добавить unit-тест в [`apps/web/src/lib/__tests__/auth-guard.test.ts`](../apps/web/src/lib/__tests__/auth-guard.test.ts):
   ```typescript
   it('isAdminUser returns true for "admin" role', () => { ... });
   it('isAdminUser returns true for "administrator" role', () => { ... });
   it('isAdminUser returns false for regular user', () => { ... });
   ```
4. Не менять inline-проверку в [`api/auth/login/route.ts`](../apps/web/src/app/api/auth/login/route.ts:157): там проверяется локальный массив `roles` до формирования `JwtUserPayload`; адаптация потребовала бы лишней обёртки без пользы для RBAC.

**Не делать:** менять схему БД, переименовывать роли, изменять RBAC permissions.

**Верификация после:**
```bash
python scripts/route_audit.py
pnpm --filter @ems/web exec tsc --noEmit
pnpm test
```

**DoD:**

- [x] `isAdminUser(user)` добавлен в [`auth-guard.ts`](../apps/web/src/lib/auth-guard.ts:50) с unit-тестами.
- [x] Inline admin-role checks в API routes унифицированы; исключение `auth/login` документировано.
- [x] `pnpm test`: 160 passed, 0 failed; lint/tsc PASS.
- [x] `route_audit.py`, theme check и quality baseline PASS.
- Коммит: `refactor(auth): unify admin role check via isAdminUser helper`

---

### Story B4 — Замена остаточных `console.*` на `logger` в API ✅

**Статус:** завершена 2026-08-29; четыре production API logging paths переведены на structured [`logger`](../apps/web/src/lib/logger.ts), поведение обработчиков сохранено.
**Приоритет:** LOW
**Скиллы:** `senior-backend`
**Оценка:** 0.5 дня

**Проблема:** Инспекция 2026-08-29 выявила 4 вхождения `console.warn/error` в production API paths вне ранее закрытого B1 bounded списка:

| Файл | Строка | Тип | Контекст |
|---|---|---|---|
| [`api/srm/issues/route.ts:156`](../apps/web/src/app/api/srm/issues/route.ts) | 156 | `console.warn` | Не удалось записать лог аудита |
| [`api/eps/import/execute/route.ts:134`](../apps/web/src/app/api/eps/import/execute/route.ts) | 134 | `console.error` | Ошибка создания кастомного поля при импорте |
| [`api/eps/import/execute/route.ts:326`](../apps/web/src/app/api/eps/import/execute/route.ts) | 326 | `console.error` | Ошибка выполнения импорта оборудования |
| [`api/setup/execute/route.ts:162`](../apps/web/src/app/api/setup/execute/route.ts) | 162 | `console.warn` | Не удалось записать `.env` на диск |

**Шаги:**

1. В каждом файле убедиться, что `logger` уже импортирован (или добавить `import { logger } from '@/lib/logger'`).
2. Заменить:
   - `console.warn('Не удалось записать лог аудита SRM:', e)` → `logger.warn('Не удалось записать лог аудита SRM', { error: e, context: 'srm-issues-audit' })`
   - `console.error('Ошибка создания поля ${def.key}:', err)` → `logger.error('Ошибка создания кастомного поля при импорте', { fieldKey: def.key, error: err })`
   - `console.error('Ошибка выполнения импорта оборудования:', error)` → `logger.error('Ошибка выполнения импорта оборудования', { error })`
   - `console.warn('Could not write to disk .env:', envErr)` → `logger.warn('Could not write .env to disk', { error: envErr })`
3. Не трогать логику: все catch-блоки сохраняют исходное поведение (best-effort).
4. Проверить, что `logger` из [`apps/web/src/lib/logger.ts`](../apps/web/src/lib/logger.ts) принимает объектный второй аргумент (context).

**Верификация после:**
```bash
# Убедиться что console.* не осталось в API
grep -r "console\." apps/web/src/app/api/ --include="*.ts"
pnpm --filter @ems/web exec tsc --noEmit
pnpm --filter @ems/web lint
```

**DoD:**

- [x] 0 вхождений `console.warn/error/log` в `apps/web/src/app/api/**/*.ts`.
- [x] `pnpm test`: 160 passed, 0 failed; lint/tsc PASS.
- [x] `route_audit.py`, theme check и quality baseline PASS.
- Коммит: `refactor(api): replace remaining console.warn/error with structured logger`

---

### C1.1 — Maintenance panel extraction ✅

**Статус:** завершено 2026-08-29.
**Файлы:** [`AdminMaintenancePanel.tsx`](../apps/web/src/components/admin/settings/AdminMaintenancePanel.tsx), [`AdminSettingsPage`](../apps/web/src/app/admin/settings/page.tsx).
**Результат:** глобальная и модульная maintenance UI вынесена в typed presentation-компонент; state, fetch и handlers остались в route owner. API-контракты и UI-поведение не менялись.
**Проверки:** lint, tsc, `pnpm test` (160/160), quality baseline (web 78.4, F-grade 38) — PASS.
**Коммит:** `refactor(admin): extract maintenance panel from settings page`.

**Следующие под-stories C1:**

- [x] **C1.2a** — LDAP integration panel вынесен в [`AdminLdapIntegrationPanel.tsx`](../apps/web/src/components/admin/settings/AdminLdapIntegrationPanel.tsx); result DTO и callbacks сохранены.
- [x] **C1.2b** — SRM integration panel вынесен в [`AdminSrmIntegrationPanel.tsx`](../apps/web/src/components/admin/settings/AdminSrmIntegrationPanel.tsx); provider-specific fields, diagnostics и callbacks сохранены. Проверки: 160 тестов, lint, tsc, route audit, theme check и quality baseline (web 78.5, F=38) — PASS.
- [x] **C1.3** — database dump panel вынесен в [`AdminDatabaseDumpPanel.tsx`](../apps/web/src/components/admin/settings/AdminDatabaseDumpPanel.tsx); `dumpMode`, confirmation flow и download behavior сохранены. Проверки: 160 тестов, lint, tsc, route audit, theme check и quality baseline (web 78.5, F=37) — PASS.
- [x] **C1.4** — страница проверена после extraction: 516 строк, все imports используются, lint/tsc и diff-check PASS. Дополнительное дробление orchestration/state не требуется.

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

### Story C2 — Warehouse topology modal (927 строк, cx 12.7; decomposed into C2.1–C2.3)

**Файл:** [`apps/web/src/components/wms/WarehouseTopologyModal.tsx`](../apps/web/src/components/wms/WarehouseTopologyModal.tsx)
**Скиллы:** `senior-frontend`, `senior-backend` (cell CRUD invariants)
**Оценка:** 1.5 дня

Вынести: zone list, cell grid, batch generate, delete confirm.
Особо проверить rollback при ошибке `handleDeleteCell` / `handleBatchGenerate`.
Не менять API зон/ячеек.

### C2.1 — Zone navigation panel ✅

**Статус:** завершено 2026-08-29.
**Файлы:** [`WarehouseZonesNavigation.tsx`](../apps/web/src/components/wms/WarehouseZonesNavigation.tsx), [`WarehouseTopologyModal`](../apps/web/src/components/wms/WarehouseTopologyModal.tsx).
**Результат:** навигация зон и кнопка создания зоны вынесены в presentation-компонент; selection/search state и CRUD handlers остались в родителе. Удалён реальный unused `SearchIcon`; API и поведение не изменены.
**Проверки:** lint, tsc, 160 тестов, route audit, theme check, quality baseline (web 78.6, F=37, SOLID=25) — PASS.

**Следующие под-stories C2:**

- [x] **C2.2** — active-zone content и cell grid вынесены в [`WarehouseActiveZonePanel.tsx`](../apps/web/src/components/wms/WarehouseActiveZonePanel.tsx); `filteredCells`, search, create/batch/delete callbacks и empty state сохранены. Удалены ставшие неиспользуемыми imports. Проверки: 160 тестов, lint, tsc, route audit, theme check и quality baseline (web 78.7, F=37, SOLID=25) — PASS.
- [x] **C2.3** — modal и выделенные панели проверены: parent 615 строк, navigation 114, active-zone 272; lint/tsc, 160 тестов, route audit, theme check и quality baseline (web 78.7, F=37, SOLID=25) — PASS. API contracts, CRUD callbacks и state ownership сохранены.

Коммиты: `46b1e10` — `refactor(wms): extract warehouse zones navigation`; `f463c9d` — `refactor(wms): extract active zone and cell grid panel`.

### Story C3 — WMS stock page (905 строк; decomposed into C3.1–C3.4)

**Файл:** [`apps/web/src/app/wms/stock/page.tsx`](../apps/web/src/app/wms/stock/page.tsx)
**Скиллы:** `senior-frontend`
**Оценка:** 1 день

Вынести: filter model, sort handler, zone loader, table section.
Использовать `FilterToolbar`, `SearchInput`, `DataTableWrapper`, `EmptyState`.

### C3.1 — Filter toolbar/model ✅

**Статус:** завершено 2026-08-29.
**Файлы:** [`WmsStockFilters.tsx`](../apps/web/src/components/wms/WmsStockFilters.tsx), [`wms/stock/page.tsx`](../apps/web/src/app/wms/stock/page.tsx).
**Результат:** фильтры склада/зоны/категории, SearchInput, low-stock switch и ExportButton вынесены в typed shared-UI wrapper; state, pagination, export и dictionary loading остались в route owner. Option-типы экспортированы из page для type-safe props. API и поведение не изменены.
**Проверки:** lint, tsc, 160 тестов, route audit, theme check, quality baseline (web 78.7, F=37, SOLID=25) — PASS.

**Следующие под-stories C3:**

- [x] **C3.2** — `ZoneCell` вынесен в [`WmsStockZoneCell.tsx`](../apps/web/src/components/wms/WmsStockZoneCell.tsx); table props, click behavior и permission gating сохранены.
- [x] **C3.3** — полный verification: lint/tsc, 160 тестов, route audit, theme check и quality baseline (web 78.8, F=36, SOLID=25) — PASS.
- [x] **C3.4** — C3 зафиксирована коммитом `refactor(wms): extract stock filters toolbar` и отдельным изменением `WmsStockZoneCell`.


### Story C4 — Equipment wizard form (843 строк; decomposed into C4.1–C4.3)

**Файл:** [`apps/web/src/components/eps/EquipmentWizardForm.tsx`](../apps/web/src/components/eps/EquipmentWizardForm.tsx)
**Скиллы:** `senior-frontend`
**Оценка:** 1.5 дня

Вынести: `renderFieldInput` → field renderer map; `handleSave` validation → pure function.
Не дублировать `CustomFieldValueRenderer`.

### C4.1 — Custom field renderer ✅

**Статус:** завершено 2026-08-29.
**Файлы:** [`EquipmentCustomFieldRenderer.tsx`](../apps/web/src/components/eps/EquipmentCustomFieldRenderer.tsx), [`EquipmentWizardForm.tsx`](../apps/web/src/components/eps/EquipmentWizardForm.tsx).
**Результат:** ветки BOOLEAN/SELECT/TEXTAREA/default вынесены в typed presentation-компонент; `customFieldValues` state и `handleCustomFieldChange` сохранены в родителе. Поведение формы и API-контракт не изменены.
**Проверки:** lint, tsc, 160 тестов, theme check и quality baseline (web 78.9, F=36, SOLID=25) — PASS.

**Следующие под-stories C4:**

- [x] **C4.2** — validation и payload preparation вынесены в [`equipment-wizard-submit.ts`](../apps/web/src/components/eps/equipment-wizard-submit.ts); поля payload, `asDraft` и `submitForApproval` сохранены. Проверки: lint, tsc, 160 тестов, theme check и quality baseline (web 79.0, F=36, SOLID=25) — PASS.
- [x] **C4.3** — финально проверены размер формы (756 строк), imports и полный gate: lint/tsc, 160 тестов, theme check и quality baseline (web 79.0, F=36, SOLID=25) — PASS.

Коммит: `refactor(eps): extract equipment custom field renderer`

### Story C5 — EPS reports (842) + Smart import (820)

**Оценка:** 2 дня, **несколько bounded коммитов**

- Reports: column builder / export JSON уже частично в `components/eps/reports/` — донести остаток `ReportBuilderContent`.
- Import: `handleAnalyzeFile` / `handleExecuteImport` в service helpers рядом с [`eps-import-helpers.ts`](../apps/web/src/lib/eps-import-helpers.ts). Добавить fixture test на collision/error counts.

### C5.2b.1 — Smart Import upload step ✅

**Статус:** завершено 2026-08-29.
**Файлы:** [`SmartImportUploadStep.tsx`](../apps/web/src/components/eps/SmartImportUploadStep.tsx), [`SmartImportWizard.tsx`](../apps/web/src/components/eps/SmartImportWizard.tsx).
**Результат:** STEP 0 загрузки файла и reference-template panel вынесены в presentation-компонент; selected file, analyzing state и analyze/download handlers сохранены в wizard. API behavior не изменён.
**Проверки:** lint, tsc, 160 тестов, route audit, theme check и quality baseline (web 79.1, F=36, SOLID=25) — PASS.

**Следующие под-stories C5.2b:**

- [x] **C5.2b.2** — mapping/missing-fields presentation вынесен в [`SmartImportMappingStep.tsx`](../apps/web/src/components/eps/SmartImportMappingStep.tsx); resolutions, column mapping и callbacks сохранены. Проверки: lint, tsc, 160 тестов, route audit, theme check и quality baseline (web 79.1, F=36, SOLID=25) — PASS.
- [x] **C5.2b.3** — preview/conflict presentation вынесен в [`SmartImportPreviewStep.tsx`](../apps/web/src/components/eps/SmartImportPreviewStep.tsx); conflict strategy, preview filters/counts, table rows и execute/back callbacks сохранены. Проверки: lint, tsc, 160 тестов, route audit, theme check и quality baseline (web 79.2, F=36, SOLID=25) — PASS.
- [x] **C5.2b.4** — execute payload preparation вынесена в [`smart-import-submit.ts`](../apps/web/src/components/eps/smart-import-submit.ts); `rows`, `columnMapping`, `newFieldDefinitions`, `ignoredHeaders` и `conflictStrategy` сохранены без изменения API contract. Проверки: lint, tsc, 160 тестов, route audit, theme check и quality baseline (web 79.3, F=36, SOLID=25) — PASS.

Коммит:

- `refactor(eps): extract report builder content from page`
- `refactor(eps): extract smart import analyze/execute handlers`

### Story C6 — Остальные P1 страницы > 600 строк (decomposed into bounded stories)

По одному коммиту, тот же рецепт. C6.1 inventory актуализирован; C6.2a, C6.3, C6.5, C6.6, C6.7, C6.8 и C7 завершены:

- [x] **C6.2a** — filter toolbar WMS inventory вынесен в [`WmsInventoryFilters.tsx`](../apps/web/src/components/wms/WmsInventoryFilters.tsx); filter/reset/pagination behavior сохранены. Проверки: lint, tsc, 160 тестов, route audit, theme check и quality baseline (web 79.3, F=36, SOLID=25) — PASS.
- [x] **C6.3** — lifecycle-event mapping EPS equipment passport page вынесен в [`equipment-lifecycle-events.ts`](../apps/web/src/components/eps/equipment-lifecycle-events.ts); state, handlers и API contracts сохранены в [`page.tsx`](../apps/web/src/app/eps/[id]/page.tsx). Проверки: lint, tsc, 160 тестов, route audit, theme check, `git diff --check` и quality baseline (web 79.4, F=36, SOLID=25; packages 94.1, F=0, SOLID=0) — PASS.

- [x] **C6.5** — setup wizard payload builder вынесен в [`setup-payload.ts`](../apps/web/src/app/setup/setup-payload.ts); [`handleExecuteSetup`](../apps/web/src/app/setup/page.tsx) сохранил payload shape, API contract и navigation behavior. Проверки: lint, tsc, targeted quality checker и `git diff --check` — PASS; web baseline до story: 79.4, F=36, SOLID=25. Commit: `9203fa6`.

- [x] **C6.6** — warehouse submit request builder вынесен в [`warehouse-submit.ts`](../apps/web/src/app/wms/warehouses/warehouse-submit.ts); submit payload, endpoint selection и validation behavior сохранены. Commit: `5613e7a`.

- [x] **C6.8** — WMS dashboard deficit item вынесен в [`WmsDeficitItem.tsx`](../apps/web/src/components/wms/WmsDeficitItem.tsx); deficit presentation и расчет индикатора сохранены, dashboard data fetching/API contracts не изменены. Проверки: lint, tsc, quality baseline (web 79.7, F=36, SOLID=25) и `git diff --check` — PASS. Commit: `370bf87`.

- [x] **C7** — StockDetailDrawer overview tab вынесен в [`StockDetailOverviewTab.tsx`](../apps/web/src/components/wms/StockDetailOverviewTab.tsx); drawer state, operations loading, permissions и callbacks сохранены. Проверки: lint, tsc, targeted quality checker (72/100, C), `git diff --check` — PASS. Commit: `eab0fa1`.

- [x] **C7.1** — spare-parts branch of [`EquipmentOperationalTabs.tsx`](../apps/web/src/components/eps/EquipmentOperationalTabs.tsx) вынесен в [`EquipmentSparePartsTab.tsx`](../apps/web/src/components/eps/EquipmentSparePartsTab.tsx); existing data, StatusBadge, DataTableWrapper and EmptyState contracts preserved. Проверки: lint, tsc, targeted quality checker, quality baseline и `git diff --check` — PASS. Commit: `15c8dc6`.

Следующий bounded этап — C8: remaining P2/F-grade files and typed JSON boundaries.

C6.5 закрыта отдельным коммитом `9203fa6`; последующие изменения должны сохранять payload shape и API contract setup flow.

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

## Phase D — Type safety (keep separate from C)

**Priority:** P2
**Skills:** `strict-api`, `senior-backend`

1. External JSON boundaries: use `unknown` plus a type guard or Zod (login already uses Zod).
2. Priority areas: `apps/web/src/lib/srm-providers`, `apps/web/src/lib/jira`, and WMS/EPS API bodies.
3. Remove `as any` only together with a schema or guard in the same file; do not perform a repository-wide replacement.
4. **D.1 ✅** — GitLab `testConnection()` response narrowed from `unknown` through a local type guard; behavior and API contract preserved. Commit: `c5b39df`.
5. **D.4 ✅** — Redmine `testConnection()` response narrowed from `unknown` through a local type guard; behavior and API contract preserved. Commit: `06f7964`.

Next story: select one adjacent external boundary in SRM/Jira without broad `any` cleanup.

Commit template: `refactor(srm): type webhook payload as unknown and narrow`

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

## Расписание (рекомендуемое, обновлено 2026-08-29)

| Неделя | Stories | Результат |
|---|---|---|
| ~~1~~ | ~~A1, A2, A3, B1~~ | ✅ security residual закрыт, logging (bounded) |
| ~~2~~ | ~~B2~~ | ✅ StatusBadge в паспорте |
| ~~Текущая~~ | ~~B3~~ | ✅ role string унификация завершена |
| ~~Следующая~~ | ~~B4~~ | ✅ console.* cleanup завершён |
| ~~Следующая~~ | ~~C1, C2, C3~~ | ✅ крупные UI-монолиты декомпозированы |
| ~~Текущая~~ | ~~C5.2b.4~~ | ✅ execute payload preparation и финальная проверка C5 завершены |
| **Следующая** | **C6** | остальные P1-файлы > 600 строк |
| +3 | C6 (4–6 файлов) | F-grade < 38 |
| backlog | C7, D, E | parser false-positives, typing, rules sync |

---

## Definition of Done всего плана

- [x] A1–A3 закрыты тестами
- [x] Unsigned webhook не принимается по умолчанию
- [x] `.env.example` без demo Jira token
- [x] StatusBadge для статусов сущностей — сквозное применение
- [x] 0 hex-цветов в компонентах вне theme-файлов
- [x] 0 rate-limit gaps на 85 маршрутах
- [x] `isAdminUser()` хелпер унифицирует admin-role проверки в API routes (B3)
- [x] 0 `console.warn/error` в `apps/web/src/app/api/**` (B4)
- [x] Web F-grade < 38, baseline PASS (C1/C2/C3/C4; F-grade 36)
- [x] `pnpm check:quality`, `check:theme`, `route_audit.py`, `pnpm test` зелёные для завершённых stories
- [x] [`PROJECT_INSPECTION.md`](PROJECT_INSPECTION.md) обновлён после B3/B4 и C1–C4; завершённые stories не добавили новых findings

---

---

## Правила выполнения для агентов — напоминание

1. **Одна story = один коммит** типа `fix:` / `refactor:` / `docs:`.
2. **Перед кодом:** прочитать затронутые файлы целиком (`read_file`), не выдумывать API.
3. **Shared UI** только из `@/components/ui`. Hex в `sx` запрещён. Статусы — только `StatusBadge`.
4. **После каждой story минимально:**
   ```bash
   pnpm --filter @ems/web lint
   pnpm --filter @ems/web exec tsc --noEmit
   ```
   Security/API stories: добавить `pnpm test` и `python scripts/route_audit.py`.
   Декомпозиция (C*): добавить `node scripts/check-quality-baseline.mjs`.
5. **Quality checker** некорректно режет границы TSX-функций — всегда проверять вручную.
6. **Не трогать:** `temp/`, `.env`, `uploads/`, `docker/jira/server.js` без отдельной задачи.
7. **Не** массово заменять magic_number.
8. **B3, B4, C1–C5, C6.2a, C6.3, C6.5, C6.6, C6.7 и C7 завершены.** Следующий этап — C6.8: следующий P1/F-grade bounded файл.
9. **C-stories** могут идти параллельно на разных файлах (не пересекающихся).
10. **Не снижать** quality baseline: web ≥ 78.0, F ≤ 38, packages ≥ 94.0, F=0.

*Updated 2026-08-29 after D.4. Stories A1–A3, B1–B4, C1–C5, C6.2a, C6.3, D.1 and D.4 are closed.*
