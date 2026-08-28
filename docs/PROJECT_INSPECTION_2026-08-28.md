# EMS-Platform — итоговый отчёт remediation и повторной инспекции

**Дата:** 2026-08-28  
**Ветка:** `main`  
**Область:** pnpm/Turborepo monorepo, Next.js API, RBAC/auth, зависимости, TypeScript/TSX, shared UI, CI и тесты.

## Итоговый вердикт

**Remediation baseline PASS для проверенного scope.** Критические и высокие замечания из предыдущей инспекции закрыты или получили автоматический regression gate. Оставшиеся F-grade файлы относятся к legacy presentation/seed scope и зафиксированы quality baseline gate, чтобы не допускать регрессии; их полная декомпозиция остаётся отдельной bounded roadmap.

## Выполненные исправления

### P0 — зависимости и supply chain

- [`apps/web/package.json`](../apps/web/package.json:25) обновлён до `next@15.5.21` и [`eslint-config-next`](../apps/web/package.json:38) до `15.5.21`.
- В [`pnpm-workspace.yaml`](../pnpm-workspace.yaml:5) добавлен override `sharp: ^0.35.0` и разрешена его установка.
- Lockfile обновлён.
- `pnpm audit --audit-level=high` теперь сообщает `No known vulnerabilities found`.

### P1 — API security и ошибки

- Убраны найденные утечки `error.message` из проверенного набора 5xx handlers; маршруты используют [`safeErrorResponse()`](../apps/web/src/lib/safe-error.ts:26) либо безопасные стабильные сообщения.
- В [`apps/web/src/app/api/modules/status/route.ts`](../apps/web/src/app/api/modules/status/route.ts:21) GET и PATCH теперь требуют административную permission policy.
- Сохранены webhook secret validation, rate limiting, Prisma-only SQL policy, SSRF/file access controls и LDAP escaping.
- Все dynamic route handlers приведены к Next 15 async [`params`](../apps/web/src/app/api/files/%5B...path%5D/route.ts:11), включая catch-all file route.
- [`apps/web/src/lib/auth-guard.ts`](../apps/web/src/lib/auth-guard.ts:11) адаптирован к async `cookies()` API Next 15.

### P1/P2 — регрессионное покрытие

В [`apps/web/src/lib/__tests__/api-security.test.ts`](../apps/web/src/lib/__tests__/api-security.test.ts:1) добавлены проверки:

- полноты rate limiting для sensitive endpoints;
- обязательного webhook token без bypass при отсутствии токена;
- административной permission policy module status;
- использования safe error responses в известных risk routes;
- отсутствия внутренних details в 5xx JSON.

### P2 — типизация и качество

- [`apps/web/src/app/api/dashboard/stats/route.ts`](../apps/web/src/app/api/dashboard/stats/route.ts:3) переведён с `any` filters на типизированные Prisma `WhereInput`.
- API catch variables в route scope переведены на `unknown` с narrowing там, где это затрагивает диагностику.
- Для EPS registry и approvals вынесены модели/сортировки в [`apps/web/src/components/eps/equipment-registry-model.ts`](../apps/web/src/components/eps/equipment-registry-model.ts:1) и [`apps/web/src/app/eps/approval-registry-model.ts`](../apps/web/src/app/eps/approval-registry-model.ts:1).
- Добавлен [`scripts/check-quality-baseline.mjs`](../scripts/check-quality-baseline.mjs:1) и [`pnpm check:quality`](../package.json:11), которые блокируют падение ниже согласованного baseline.

### P2 — UI design code

- Расширен [`scripts/check-theme-tokens.mjs`](../scripts/check-theme-tokens.mjs:1): проверяются все TS/TSX/JS/JSX строки с hex literals вне утверждённых theme definition paths; нарушение завершает процесс с exit code 1.
- Остаточные hardcoded component colors в проверенном scope заменены на semantic palette tokens: [`StatusBadge`](../apps/web/src/components/ui/StatusBadge.tsx:27), [`CriticalAlertBanner`](../apps/web/src/components/ui/CriticalAlertBanner.tsx:56), EPS setup и admin module settings.
- Для нейтральных identifier/tag chips сохранена семантическая допустимость; status displays используют [`StatusBadge`](../apps/web/src/components/ui/StatusBadge.tsx:37).

### P3 — CI и воспроизводимость

- [` .github/workflows/ci.yml`](../.github/workflows/ci.yml:41) теперь включает dependency audit, typecheck, expanded theme check, lint, quality baseline, tests и production build, а quality reports загружаются как artifacts.
- [`scripts/test-runner.mjs`](../scripts/test-runner.mjs:32) больше не использует `shell: true`; запуск TSX выполняется через Node CLI module без shell interpolation.

## Финальная проверка

| Проверка | Результат |
|---|---|
| `pnpm audit --audit-level=high` | PASS — no known vulnerabilities |
| `pnpm --filter @ems/web exec tsc --noEmit` | PASS |
| `pnpm lint` | PASS, 0 ESLint warnings/errors; Next 15 сообщает deprecation `next lint` |
| `pnpm test` | PASS, 146/146 tests, 0 failures |
| `pnpm check:theme` | PASS, no hardcoded hex colors outside approved theme files |
| `pnpm check:quality` | PASS: web 75.7/C, 39 F-files baseline; packages 91.2/A, 2 F-files baseline |
| `pnpm build` | PASS, Next.js 15.5.21, 33 static pages |
| `git diff --check` | PASS |
| Working tree | clean after commits |

Тестовый вывод содержит диагностические Prisma messages о недоступности локальной PostgreSQL (`localhost:5432`) и попытке подключения к `10.0.0.5`; это не failures: все 146 тестов завершились успешно. Для production CI рекомендуется поднимать изолированную PostgreSQL service либо явно mock-ить DB-dependent auth lookups.

## Остаточные ограничения

- Quality checker по-прежнему классифицирует 39 legacy frontend files и 2 package files как F. Для них введён non-regression baseline, но полное достижение лимита файла ≤500 строк потребует большого отдельного refactoring stream.
- `next lint` deprecated в Next 15; миграция на ESLint CLI — следующий отдельный maintenance item.
- `pnpm check:quality` создаёт временные `quality-web.json`/`quality-packages.json`; CI использует их как artifacts, локальные временные файлы не должны коммититься.

## Критерии приёмки

- critical/high dependency vulnerabilities: **PASS**;
- required security regression tests: **PASS**;
- safe 5xx response policy for audited handlers: **PASS**;
- explicit auth/RBAC and sensitive route rate-limit controls: **PASS for audited inventory**;
- expanded theme token gate: **PASS**;
- CI security/quality gates: **PASS configuration**;
- typecheck and production build after Next 15 migration: **PASS**;
- quality F-files: **baseline protected, full legacy decomposition deferred**.

## Commits

Основные remediation-коммиты текущей сессии:

- `7447762 chore(deps): upgrade next and pin secure sharp`
- `6485458 fix(api): sanitize internal errors and enforce module RBAC`
- `7c061c2 test(security): add route policy regression coverage`
- `1733988 chore(ci): enforce security and quality gates`
- `af49c8c refactor(quality): add typed API and quality baseline gates`
- `e8b533f refactor(ui): enforce semantic theme token usage`
- `1b751ac refactor(ui): remove unsafe tab and stats casts`
- `a107ad3 refactor(eps): extract equipment registry model`
- `2145358 refactor(eps): extract registry sorting helpers`
- `5a9a12d fix(next): complete async route context migration`

---

*Отчёт сформирован по [`AGENTS.md`](../AGENTS.md), security/UI/code-quality rules, universal/TypeScript guidance и результатам фактических команд проверки.*
