# EMS-Platform — инспекция качества и готовности к релизу (снимок 2026-08-31)

> **Неизменяемый снимок.** Фиксирует инспекцию состояния ветки `main` от
> исходного HEAD `9056aa7` и исправления, внесённые в рамках этой проверки.
> Актуальные вычисляемые метрики находятся в
> [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md),
> [`COVERAGE_BASELINE.md`](../COVERAGE_BASELINE.md) и
> [`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md).

**Дата:** 2026-08-31  
**Исходная ветка / HEAD:** `main` / `9056aa7`  
**Скилл:** [`code-reviewer`](../../../.agents/skills/code-reviewer/SKILL.md)  
**Правила:** [`AGENTS.md`](../../../AGENTS.md),
[`code_quality.md`](../../../.agents/rules/code_quality.md),
[`security.md`](../../../.agents/rules/security.md)

> **Вердикт: ✅ готово к релизу после исправлений этой инспекции.**
> Production build, Docker image, versioned migrations, health endpoint,
> fail-closed migration startup, unit/component/E2E tests and all repository
> gates were verified successfully. Deployment still requires normal release
> operations: production secrets, TLS certificates, backup, and migration
> baseline for databases created before versioned migrations.

---

## 1. Проверенные релизные гейты

| Проверка | Итог |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ PASS |
| `pnpm db:generate` | ✅ PASS |
| TypeScript `tsc --noEmit` | ✅ PASS |
| ESLint | ✅ PASS |
| `pnpm test` | ✅ PASS: 40 files, 232 tests |
| Vitest + RTL | ✅ PASS: 4 files, 32 tests |
| Coverage gate | ✅ PASS |
| Production Next.js build | ✅ PASS: 4/4 Turbo tasks |
| Playwright E2E | ✅ PASS: 13 tests |
| Dependency audit (`high`) | ✅ No known vulnerabilities |
| Quality baseline | ✅ PASS |
| Theme-token gate | ✅ PASS |
| Documentation links | ✅ PASS: 109 files |
| Plans index | ✅ PASS: 0 active, 79 done |
| Route security audit | ✅ 0 routes without rate limit; 0 sensitive gaps |
| Script syntax | ✅ PASS |
| Prisma schema validation | ✅ PASS |
| Production/offline Compose config | ✅ PASS |
| Dockerfile build check | ✅ PASS, no warnings |
| Production Docker image build | ✅ PASS |
| Fresh database migration + health smoke | ✅ PASS |
| Existing non-baselined DB startup | ✅ P3005 visible, app does not start |

---

## 2. Качество кода

Генерируемый baseline остаётся зелёным. Подробные значения не дублируются в
этом снимке; источник истины — [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md).

При ручной приоритизации F-grade списка подтверждены сохраняющиеся зоны риска:

1. [`apps/web/src/app/srm/page.tsx`](../../../apps/web/src/app/srm/page.tsx) —
   checker сообщает высокую сложность обработчика; границы TSX требуют ручной
   перепроверки перед рефакторингом.
2. [`apps/web/src/app/admin/module-settings/page.tsx`](../../../apps/web/src/app/admin/module-settings/page.tsx) —
   крупный stateful UI-модуль с высокой ветвистостью.
3. [`apps/web/src/app/wms/page.tsx`](../../../apps/web/src/app/wms/page.tsx),
   [`apps/web/src/components/mro/MroExecutionWizardDialog.tsx`](../../../apps/web/src/components/mro/MroExecutionWizardDialog.tsx) и
   [`apps/web/src/app/wms/warehouses/page.tsx`](../../../apps/web/src/app/wms/warehouses/page.tsx) —
   оставшиеся длинные обработчики.

Это технический долг, а не релизный blocker: baseline не регрессировал,
пакеты имеют ноль F-grade файлов, production build и тесты зелёные.

---

## 3. Найденные дефекты и исправления

### 3.1 [BLOCKER] Общий test runner подхватывал Vitest-компонентные тесты

[`test-runner.mjs`](../../../scripts/test-runner.mjs) рекурсивно находил новые
`*.test.tsx` из `components/ui/__tests__` и пытался выполнить их через
`node:test`. В результате `pnpm test` и coverage gate падали с ошибкой
`Vitest cannot be imported in a CommonJS module`.

Исправлено явным разделением владельцев тестов: Node runner исключает корень
Vitest component tests, которые продолжают выполняться отдельной командой
`test:components`. После исправления Node suite выполняет 40 файлов / 232 теста,
а Vitest — 4 файла / 32 теста.

### 3.2 [BLOCKER] CI E2E был нестабилен из-за внутреннего setup-status rate limit

Middleware при каждом защищённом переходе делал внутренний запрос к
`/api/setup/status`. Все внутренние probes и браузерные запросы учитывались как
один localhost IP, поэтому последовательный Playwright suite превышал quota и
middleware ошибочно перенаправлял настроенную систему в `/setup`.

[`isSetupCompleted()`](../../../apps/web/src/middleware.ts:23) теперь маркирует
внутренний probe отдельным loopback client IP. E2E helper также задаёт каждому
browser context уникальный synthetic proxy IP до первой навигации. Полный
Playwright suite стабильно прошёл: 13/13.

### 3.3 [HIGH] EPS approval E2E использовал устаревшие доступные имена

Тест искал заголовок `Согласования`, нажимал первый button, совпавший по слову
`Решение`, и не ожидал сохранения PATCH. Это выбирало sortable column header или
создавало race с навигацией.

[`eps-approval.spec.ts`](../../../apps/web/e2e/eps-approval.spec.ts) приведён к
реальному доступному контракту: точный PageHeader, action внутри строки,
`Утвердить` в review dialog и ожидание обновлённого статуса до перехода.

### 3.4 [HIGH] WMS transfer action отсутствовал в UI

State и [`TransferRequestDialog`](../../../apps/web/src/components/wms/TransferRequestDialog.tsx)
существовали, но `setIsRequestDialogOpen(true)` нигде не вызывался. Пользователь
не мог открыть форму, а E2E ожидал несуществующую кнопку.

В [`WmsOperationsContent()`](../../../apps/web/src/app/wms/operations/page.tsx:53)
добавлен permission-aware action `Создать перемещение` на transfer tab. Тест
проверяет открытие реальной формы, её доступные поля, disabled submit без
warehouse fixtures и отсутствие action у guest.

### 3.5 [HIGH] Baremetal pack scripts ссылались на удалённый путь документации

Linux и PowerShell pack scripts копировали
`docs/BAREMETAL_OFFLINE_DEPLOYMENT.md`, хотя документ перемещён в
`docs/operations/`. Такой release bundle падал бы на этапе packaging.

Исправлены [`baremetal-pack.sh`](../../../scripts/baremetal-pack.sh) и
[`baremetal-pack.ps1`](../../../scripts/baremetal-pack.ps1); существование
release inputs и shell syntax проверены.

### 3.6 [MEDIUM] Docker build context включал локальный `.next` размером более 700 MB

Root pattern `.next` в [`.dockerignore`](../../../.dockerignore) не исключал
`apps/web/.next`. Первый build передал около 756 MB контекста и столкнулся с
сетевым fetch failure. Добавлены workspace-aware patterns для `.next` и
`.turbo`; повторная передача контекста сократилась до десятков килобайт, после
чего production image успешно собрался.

### 3.7 [MEDIUM] Закрытые story содержали битые относительные ссылки

Перенос M1–M6 в `plans/done/2026-08/` оставил ссылки с глубиной `../../`.
`check:docs` обнаружил 25 битых ссылок. Пути исправлены без изменения смысла
неизменяемых story snapshots; documentation gate снова зелёный.

---

## 4. Реальный runtime smoke production image

Production image [`Dockerfile`](../../../Dockerfile) был не только собран, но и
запущен в изолированной Docker network с `postgres:16-alpine`:

1. На чистой БД автоматически применена migration
   `20260831030000_init`.
2. Next.js стартовал после успешной миграции.
3. `GET /api/system/health` вернул `success: true`, `isReady: true`.
4. На непустой БД без Prisma migration history процесс завершился кодом 1 с
   видимым `P3005`; Next.js не стартовал.

Это подтверждает как happy path релиза, так и fail-closed защиту от запуска на
несогласованной схеме.

---

## 5. Известные ограничения и операционные условия

- File-level coverage остаётся низким по абсолютной величине: большинство
  production-файлов никогда не импортируется unit suite. Gate защищает текущий
  ratchet, но не означает исчерпывающее покрытие — см.
  [`COVERAGE_BASELINE.md`](../COVERAGE_BASELINE.md).
- E2E WMS проверяет доступ к форме запроса и RBAC, но не полный
  dispatch/receive lifecycle: стандартная E2E fixture не создаёт склады,
  номенклатуру и остатки. Название теста исправлено, чтобы не заявлять ложное
  покрытие.
- Route audit — эвристика. Два no-auth route и десять owner/setup scoped route
  вручную подтверждены как известные исключения; см.
  [`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md).
- При незаданной SRM/Jira интеграции dashboard генерирует повторяющиеся error
  logs `Failed to get SRM stats`. Это не ломает UI или healthcheck, но повышает
  шум production logs; рекомендуется понизить ожидаемый disabled-provider case
  до `info`/`debug` отдельной задачей.
- Docker image получился около 390 MB и содержит полный workspace install,
  включая build/dev dependencies. Это не blocker, но следующий этап
  контейнерной оптимизации — standalone Next.js output и production-only runner.
- Реальный релиз требует заменить все placeholder secrets из
  [`.env.production.example`](../../../.env.production.example), установить TLS,
  проверить backup/restore и выполнить documented baseline для БД старых
  установок.

---

## 6. Итог

После исправлений проект проходит полный CI-equivalent gate и практический
runtime smoke. Релиз допускается при соблюдении production runbook. Основные
оставшиеся риски — неполный охват production-файлов тестами, известные крупные
TSX-модули и операционная конфигурация конкретной среды, а не обнаруженные
блокирующие дефекты кода или упаковки.
