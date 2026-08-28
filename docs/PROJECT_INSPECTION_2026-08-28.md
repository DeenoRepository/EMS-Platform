# EMS-Platform — актуальная инспекция проекта

**Дата:** 2026-08-28  
**Ветка:** `main`  
**Область:** monorepo pnpm/Turborepo, Next.js API, RBAC/auth, зависимости, TypeScript/TSX quality, shared UI, CI и тесты.

## Итоговый вердикт

**Request changes / не готово к закрытию инспекции.**

Базовые security-remediation этапы в целом присутствуют, а компиляционные проверки проходят, но текущая проверка выявила:

1. `pnpm audit --audit-level=high` завершается с ошибкой: **21 уязвимость: 8 high, 11 moderate, 2 low**. Все выявленные high advisory относятся к [`next`](../apps/web/package.json:25); текущая версия `14.2.35` ниже исправленной ветки `15.5.21` для части advisories.
2. Актуальный quality scan [`inspection-quality-web-current.json`](inspection-quality-web-current.json) показывает **227 файлов, 75.5/100 (C), 2 226 smells, 29 SOLID violations, 39 F-files**.
3. Для [`packages`](inspection-quality-packages-current.json) обнаружено **22 файла, 91.2/100 (A), 87 smells, 2 F-files**; критичные по порогам размеры сохраняются в [`packages/database/src/seed.ts`](../packages/database/src/seed.ts:1) и [`packages/auth/src/eps.test.ts`](../packages/auth/src/eps.test.ts:1).
4. Ручной inventory подтверждает оставшиеся утечки внутренних исключений в 5xx/ошибочных API-ответах и широкое использование `any` на API boundary.
5. `pnpm check:theme` сообщает PASS, однако прямой поиск показывает остаточные hex-значения в theme-definition/semantic component конфигурации и отдельных UI-местах; поэтому checker не является полным доказательством нулевого hardcode scope.
6. Shared UI migration неполная по строгому правилу: найдено множество прямых `<TextField>` и прямых `<Table>`; часть является формами/вложенным markup, но это требует классификации и согласованного исключения либо миграции.
7. CI выполняет lint, tests и build, но не запускает `check:theme`, typecheck как отдельный gate, quality checker и dependency audit.

## Проверенные команды

| Проверка | Результат |
|---|---|
| [`pnpm --filter @ems/web exec tsc --noEmit`](../apps/web/package.json:9) | PASS, exit 0 |
| [`pnpm lint`](../package.json:9) | PASS, 0 ESLint warnings/errors |
| [`pnpm test`](../package.json:11) | PASS, 142/142 tests, 0 failures; присутствуют ожидаемые Prisma connection error logs против недоступной локальной БД |
| [`pnpm check:theme`](../package.json:10) | PASS, checker нашёл 0 нарушений в своём scope |
| [`pnpm build`](../package.json:8) | PASS, Next.js 14.2.35, 33 статические страницы |
| [`pnpm audit --audit-level=high`](../package.json:1) | FAIL, 21 vulnerabilities: 8 high, 11 moderate, 2 low |
| Quality web | 227 files, 75.5/100, C, 39 F-files |
| Quality packages | 22 files, 91.2/100, A, 2 F-files |
| PR analyzer | `no_changes` — анализ текущей ветки не заменяет full-repository audit |

## Findings

### P0 — блокирующий риск цепочки зависимостей

#### P0-1. Next.js 14.2.35 остаётся уязвимым для актуального audit-набора

`pnpm audit` сообщает 8 high advisories для [`next`](../apps/web/package.json:25). В выводе указаны исправленные версии `>=15.0.8`, `>=15.5.15`, `>=15.5.16` и `>=15.5.21`. Следовательно, ранее закрытая версия `14.2.35` исправляет старый advisory, но не весь текущий набор.

**Риск:** DoS в React Server Components/App Router, SSRF в Server Actions/rewrites и middleware/proxy bypass по затронутым сценариям.

**Действие:** провести совместимое обновление Next.js/React/`eslint-config-next` до поддерживаемой исправленной линии; проверить breaking changes App Router, middleware, server actions, build, smoke auth и повторить audit. Если остаётся Next 14, оформить явное security exception с обоснованием и compensating controls.

### P1 — API security и error handling

#### P1-1. Внутренние exception details всё ещё попадают в API responses

Подтверждённые места:

- [`apps/web/src/app/api/modules/status/route.ts`](../apps/web/src/app/api/modules/status/route.ts:113) возвращает `error.message` со статусом 500.
- [`apps/web/src/app/api/setup/execute/route.ts`](../apps/web/src/app/api/setup/execute/route.ts:347) возвращает `error.message`.
- [`apps/web/src/app/api/wms/operations/route.ts`](../apps/web/src/app/api/wms/operations/route.ts:376) возвращает `error.message` и выбирает статус по тексту исключения.
- [`apps/web/src/app/api/eps/equipment/[id]/documents/route.ts`](../apps/web/src/app/api/eps/equipment/[id]/documents/route.ts:60) возвращает `error.message`.
- Аналогичный pattern есть в [`apps/web/src/app/api/eps/equipment/[id]/photos/route.ts`](../apps/web/src/app/api/eps/equipment/[id]/photos/route.ts:66), [`apps/web/src/app/api/wms/transfers/route.ts`](../apps/web/src/app/api/wms/transfers/route.ts:391), [`apps/web/src/app/api/wms/transfers/[id]/dispatch/route.ts`](../apps/web/src/app/api/wms/transfers/[id]/dispatch/route.ts:136), [`apps/web/src/app/api/wms/transfers/[id]/receive/route.ts`](../apps/web/src/app/api/wms/transfers/[id]/receive/route.ts:181), [`apps/web/src/app/api/wms/transfers/[id]/reject/route.ts`](../apps/web/src/app/api/wms/transfers/[id]/reject/route.ts:165) и [`apps/web/src/app/api/srm/issues/[id]/create-mro-order/route.ts`](../apps/web/src/app/api/srm/issues/[id]/create-mro-order/route.ts:29).

**Риск:** раскрытие URL, SQL/ORM/driver details, filesystem paths, integration data и внутренних причин отказа.

**Действие:** использовать [`safeErrorResponse()`](../apps/web/src/lib/safe-error.ts:1) для 5xx; для ожидаемых бизнес-ошибок применять typed/domain error mapping с безопасным allowlist-сообщением, а не анализом произвольной строки исключения.

#### P1-2. Auth inventory показывает неоднородность route-level authorization

Большинство маршрутов используют `requireAuth()` либо `getCurrentUser()` с `hasPermission()`, webhook и login являются intentional public endpoints. Однако правило проекта требует permission check на каждом защищённом API-роуте, а статический inventory не может гарантировать это для всех handlers. Наиболее заметный пример — [`apps/web/src/app/api/modules/status/route.ts`](../apps/web/src/app/api/modules/status/route.ts:21): `GET` проверяет только authentication, тогда как `PATCH` проверяет admin permission.

**Действие:** перейти на единый `requireAuth(req, PERMISSIONS.*)` для каждого protected handler; для intentional public routes добавить явный route policy marker и regression inventory test.

#### P1-3. Sensitive-route rate limiting присутствует в основной матрице, но нужен автоматический контроль полноты

Текущий inventory подтверждает `enforceRateLimit()` для login, setup execute/test-db/test-ldap/status, EPS import analyze/execute/template, reports generate/templates и health. Это улучшение относительно прежнего baseline. Но наличие middleware/limiter следует проверять автоматическим тестом по route inventory, чтобы новые sensitive endpoints не обходили policy.

### P2 — качество и поддерживаемость

#### P2-1. Осталось 39 F-файлов в frontend scope

Актуальный checker выявил наиболее тяжёлые файлы:

| Файл | Метрика |
|---|---:|
| [`apps/web/src/app/eps/[id]/page.tsx`](../apps/web/src/app/eps/%5Bid%5D/page.tsx:1) | 2 024 строки, score 0 |
| [`apps/web/src/app/eps/page.tsx`](../apps/web/src/app/eps/page.tsx:1) | 1 623 строки, score 0 |
| [`apps/web/src/components/layout/Sidebar.tsx`](../apps/web/src/components/layout/Sidebar.tsx:1) | 1 429 строк, score 0 |
| [`apps/web/src/app/eps/approvals/page.tsx`](../apps/web/src/app/eps/approvals/page.tsx:1) | 1 298 строк, score 0 |
| [`apps/web/src/app/wms/operations/page.tsx`](../apps/web/src/app/wms/operations/page.tsx:1) | 1 072 строки, score 0 |
| [`apps/web/src/app/setup/page.tsx`](../apps/web/src/app/setup/page.tsx:1) | 856 строк, score 0 |
| [`apps/web/src/components/eps/EquipmentWizardForm.tsx`](../apps/web/src/components/eps/EquipmentWizardForm.tsx:1) | 843 строки, score 0 |
| [`apps/web/src/components/eps/SmartImportWizard.tsx`](../apps/web/src/components/eps/SmartImportWizard.tsx:1) | 820 строк, score 0 |

Порог проекта — файл не более 500 строк, функция не более 50 строк, complexity не более 10. Несмотря на возможные parser false positives для TSX, размеры файлов объективны и требуют bounded decomposition.

#### P2-2. В packages остаются F-файлы

- [`packages/database/src/seed.ts`](../packages/database/src/seed.ts:1) — 968 строк.
- [`packages/auth/src/eps.test.ts`](../packages/auth/src/eps.test.ts:1) — 549 строк; `processApprovalDecision` отмечена как длинная/high complexity.

**Действие:** разбить seed по доменным фабрикам/fixtures; тест approval — по сценариям и helper functions без потери покрытия.

#### P2-3. `any` остаётся широко распространённым на API boundary

Quality/policy review ранее зафиксировал 178 вхождений в `apps/web/src/app/api`; текущая ручная выборка подтверждает `catch (error: any)` и небезопасные casts, например [`apps/web/src/app/api/modules/status/route.ts`](../apps/web/src/app/api/modules/status/route.ts:44). Это нарушает правило `unknown` + narrowing и ослабляет DTO-контракты.

**Действие:** приоритетно заменить `any` в request body, catch variables и integration boundaries на `unknown`, Zod schemas и локальные adapter types. Исключения оставить только для нестабильных внешних payloads.

### P2 — дизайн-система

#### P2-4. Theme checker PASS не равен полному отсутствию hardcoded colors

[`scripts/check-theme-tokens.mjs`](../scripts/check-theme-tokens.mjs:40) проверяет только строки, содержащие ограниченный набор style markers и исключает theme/test paths. `pnpm check:theme` проходит, но прямой inventory находит hardcoded values в [`apps/web/src/theme/ThemeRegistry.tsx`](../apps/web/src/theme/ThemeRegistry.tsx:64), [`apps/web/src/components/ui/StatusBadge.tsx`](../apps/web/src/components/ui/StatusBadge.tsx:241), [`apps/web/src/components/ui/CriticalAlertBanner.tsx`](../apps/web/src/components/ui/CriticalAlertBanner.tsx:58), [`apps/web/src/app/setup/page.tsx`](../apps/web/src/app/setup/page.tsx:71), [`apps/web/src/app/admin/module-settings/page.tsx`](../apps/web/src/app/admin/module-settings/page.tsx:121) и других местах.

**Действие:** разделить допустимые theme definition/print CSS tokens и запрещённые component colors; расширить checker до multiline/style object cases и добавить approved allowlist. Не считать `0 violations` доказанным, пока scope checker не покрывает эти случаи.

#### P2-5. Shared control adoption требует классификации

В исходниках обнаружены 205 прямых `<TextField>` и 288 мест с прямыми `<Table>`/DataTable markup. Это не означает, что все случаи нарушают правило: формы и внутренние таблицы могут быть допустимыми. Но обязательные shared controls должны применяться для search, filter toolbars, empty states, status badges, KPI и data registry tables.

Подтверждённые кандидаты для проверки:

- [`apps/web/src/components/ui/SearchInput.tsx`](../apps/web/src/components/ui/SearchInput.tsx:69) уже является shared search implementation.
- Регистры с [`DataTableWrapper`](../apps/web/src/components/ui/DataTableWrapper.tsx:130) смешиваются с прямым `<Table>`, например [`apps/web/src/app/wms/operations/page.tsx`](../apps/web/src/app/wms/operations/page.tsx:594).
- Нейтральные identifier chips допустимы, но status-like presentation должна оставаться на [`StatusBadge`](../apps/web/src/components/ui/StatusBadge.tsx:1). Необходимо провести semantic classification, а не глобальную замену всех chips.

### P3 — CI/reproducibility

#### P3-1. CI не выполняет полный inspection gate

[` .github/workflows/ci.yml`](../.github/workflows/ci.yml:41) запускает lint, tests и build. В workflow отсутствуют отдельные gates для `pnpm check:theme`, `pnpm --filter @ems/web exec tsc --noEmit`, quality checker и `pnpm audit --audit-level=high`.

**Действие:** добавить отдельные шаги с артефактами JSON/Markdown; сделать theme checker fail-fast; quality/audit failures — blocking либо явно настроенные security exceptions.

#### P3-2. Test runner использует Windows shell warning и недоступную БД в окружении

[`scripts/test-runner.mjs`](../scripts/test-runner.mjs:34) использует `shell: true` на Windows. Node выводит deprecation warning о потенциально небезопасной конкатенации аргументов. Тесты проходят, но в логах есть Prisma connection errors к `localhost:5432`, а также ошибка аутентификации к `10.0.0.5:5432` из окружения.

**Действие:** убрать `shell: true`, если это совместимо с запуском `tsx.cmd`, либо использовать безопасный spawn wrapper; изолировать DB-dependent tests/mock fallback так, чтобы ожидаемая недоступность БД не выглядела как скрытая ошибка.

## Положительно подтверждено

- [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/%5Bid%5D/route.ts:56) использует корректную обязательную проверку отсутствующего или несовпадающего webhook token.
- Raw SQL ограничен двумя template-literal health probes в [`apps/web/src/app/api/setup/test-db/route.ts`](../apps/web/src/app/api/setup/test-db/route.ts:60) и [`apps/web/src/app/api/system/health/route.ts`](../apps/web/src/app/api/system/health/route.ts:108).
- Directory traversal и resource-level authorization сохранены в [`apps/web/src/app/api/files/[...path]/route.ts`](../apps/web/src/app/api/files/%5B...path%5D/route.ts:26).
- LDAP escaping реализован в `packages/auth` и покрыт тестами.
- JWT использует `jose` и env secret; root TypeScript strict mode сохранён.
- `pnpm lint`, typecheck, tests, theme check и production build проходят.
- Проверенные regression suites по rate limit, safe errors, auth guard, file access, outbound URL, LDAP, JWT, password, RBAC, SRM и WMS проходят.

## Приоритетный план remediation

1. **P0:** обновить Next.js/связанные пакеты до полной исправленной линии или утвердить exception.
2. **P1:** убрать все exception details из API 5xx; унифицировать typed business error mapping.
3. **P1:** формализовать route inventory: auth/RBAC/rate-limit policy tests для каждого endpoint.
4. **P2:** декомпозировать EPS detail/list/approvals, Sidebar и WMS operations; затем seed и approval tests.
5. **P2:** заменить `any` на `unknown` + Zod/DTO на API boundary.
6. **P2:** расширить theme checker и провести semantic UI classification для shared controls.
7. **P3:** включить в CI typecheck, theme check, quality checker и dependency audit с артефактами.
8. **P3:** убрать `shell: true` warning из test runner и сделать DB-dependent test behavior explicit.

## Критерии повторной приёмки

Инспекция может быть закрыта после выполнения следующих условий:

- `pnpm audit --audit-level=high` не содержит critical/high либо существует утверждённый security exception;
- `pnpm lint`, typecheck, tests, build и expanded theme checker завершаются с exit 0;
- CI запускает обязательные quality/security gates;
- отсутствуют внутренние exception details в 5xx API responses;
- каждый protected route имеет явную permission policy, а public routes документированы и протестированы;
- отсутствуют новые F-файлы в изменяемом scope и запланирована декомпозиция legacy F-files;
- regression coverage сохраняет webhook secret absence, rate limit exhaustion, safe errors, LDAP escaping, SSRF/private IP rejection и file resource isolation.

---

*Отчёт сформирован по правилам [`AGENTS.md`](../AGENTS.md), security/UI/code-quality rules и code-reviewer universal/TypeScript guidance. Отчёт не вносит remediation-код; он фиксирует актуальное состояние и evidence.*
