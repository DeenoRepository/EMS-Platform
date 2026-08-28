# Инспекция проекта EMS-Platform

**Дата:** 2026-08-28
**Ревизия:** рабочее дерево без незакоммиченных изменений; PR-анализатор сообщил `no_changes`
**Область:** TypeScript/Next.js API, авторизация и безопасность, качество кода, shared UI, lint, типизация, тесты, зависимости и конфигурация.
**Методика:** правила проекта из [`AGENTS.md`](../AGENTS.md), [`security.md`](../.agents/rules/security.md), [`ui_design_code.md`](../.agents/rules/ui_design_code.md), [`code_quality.md`](../.agents/rules/code_quality.md), а также universal/TypeScript правила code-reviewer, автоматический [`code_quality_checker.py`](../.agents/skills/code-reviewer/scripts/code_quality_checker.py), [`pr_analyzer.py`](../.agents/skills/code-reviewer/scripts/pr_analyzer.py), ручная проверка API-маршрутов и dependency audit.

## Итоговый вердикт

**Вердикт: Request changes / блокирующие замечания.**

Критические причины:

1. `pnpm audit --audit-level=high` обнаружил **1 critical, 16 high, 16 moderate и 3 low** уязвимости.
2. Прямо используется уязвимая версия Next.js `14.2.24`; audit указывает critical Authorization Bypass in Next.js для диапазона `<14.2.25` и дополнительные исправления до `14.2.35`/`15.5.21` в зависимости от advisory.
3. Веб-приложение содержит **40 файлов с оценкой F**, средняя оценка `74.4/100 (C)`, **2 344 code smells** и **29 SOLID violations**.
4. Проверка дизайн-кода обнаруживает **595 нарушений hardcoded color usages**; grep по исходникам находит 1 860 hex-вхождений, часть из которых не попадает под узкий детектор `sx`.
5. В чувствительных маршрутах отсутствует rate limiting на анализе импорта, шаблонах импорта/отчетов и статусе setup.
6. Обнаружены production API-ответы, возвращающие `error.message` или производные от него.

Положительные результаты: lint, typecheck и тестовый набор проходят; webhook проверяет обязательный секрет корректно; raw SQL ограничен двумя template-literal health probes; основные ранее исправленные P1-проблемы SSRF/resource-level file access подтверждены текущим кодом и тестами.

## Проверки и результаты

| Проверка | Результат | Оценка |
|---|---:|---|
| `pnpm lint` | 0 ESLint warnings/errors | PASS |
| `pnpm test` | 125 tests, 125 pass, 0 fail | PASS |
| `pnpm check:theme` | 595 hardcoded color usages | FAIL |
| `pnpm --filter @ems/web exec tsc --noEmit` | без вывода, exit code 0 | PASS |
| Code quality: `apps/web/src` | 227 файлов, 74.4/100, C, 2 344 smells, 29 SOLID | FAIL |
| Code quality: `packages` | 21 файл, 89.3/100, B, 95 smells, 0 SOLID | PASS WITH REMEDIATION |
| PR analysis | `no_changes` | N/A |
| Raw SQL | 2 допустимых `SELECT 1` health probes | PASS |
| Dependency audit | 36 уязвимостей, включая 1 critical | BLOCK |

> Тесты запускаются через скрипт `test` в [`package.json`](../package.json:11). Во время тестов Prisma печатает ошибки о незаданном `DATABASE_URL` в отдельных auth-guard сценариях, но сами тесты проходят. Это следует устранить в тестовой конфигурации, чтобы успешный прогон не сопровождался тревожными production-подобными ошибками.

## Findings

### P0 — критический приоритет

#### P0-1. Уязвимые production dependencies: Next.js ниже исправленной версии

- **Подтверждение:** [`apps/web/package.json`](../apps/web/package.json:22) фиксирует `next: 14.2.24`.
- **Audit:** `next@14.2.24` попадает под critical advisory Authorization Bypass in Next.js (`>=14.0.0 <14.2.25`), а также под ряд high/moderate advisories, исправленные в более новых версиях.
- **Риск:** обход middleware-авторизации и дополнительные SSRF/DoS/cache/XSS риски в зависимости от затронутого сценария Next.js.
- **Действие:** обновить Next.js и согласованный `eslint-config-next` до версии, закрывающей весь применимый набор advisories; регенерировать lockfile, выполнить build, lint, typecheck, tests и smoke-тест авторизации.
- **Дополнительные зависимости:** `xlsx@0.18.5` имеет high Prototype Pollution и ReDoS advisories; `postcss@8.4.31` имеет high arbitrary file read/path traversal advisories; `deepmerge-ts@7.1.5` приходит транзитивно через Prisma и имеет high stack exhaustion advisory. Обновить прямые/транзитивные зависимости либо зафиксировать утвержденные исключения с компенсирующими мерами.

### P1 — высокий приоритет

#### P1-1. Rate limiting не покрывает все чувствительные маршруты

Правила проекта требуют `enforceRateLimit()` на setup, import и reports endpoints.

- [`apps/web/src/app/api/eps/import/analyze/route.ts`](../apps/web/src/app/api/eps/import/analyze/route.ts:324) принимает и разбирает пользовательский файл, но не вызывает `enforceRateLimit()`.
- [`apps/web/src/app/api/eps/import/template/route.ts`](../apps/web/src/app/api/eps/import/template/route.ts:10) выполняет запрос к БД и генерацию XLSX без rate limit.
- [`apps/web/src/app/api/eps/reports/templates/route.ts`](../apps/web/src/app/api/eps/reports/templates/route.ts:9) не ограничивает `GET`/`POST` частотой.
- [`apps/web/src/app/api/eps/reports/templates/[id]/route.ts`](../apps/web/src/app/api/eps/reports/templates/[id]/route.ts:1) не ограничивает операции с шаблонами.
- [`apps/web/src/app/api/setup/status/route.ts`](../apps/web/src/app/api/setup/status/route.ts:75) выполняет сетевые и файловые проверки без rate limit.
- Также inventory выявил отсутствие rate limit на [`apps/web/src/app/api/auth/logout/route.ts`](../apps/web/src/app/api/auth/logout/route.ts:1) и [`apps/web/src/app/api/auth/me/route.ts`](../apps/web/src/app/api/auth/me/route.ts:1); эти маршруты не указаны в минимальной таблице правил, но их следует оценить отдельно.

**Риск:** DoS через повторную обработку XLSX, генерацию файлов, запросы к БД и сетевые probes.
**Действие:** добавить endpoint-specific лимиты с уникальными prefix; для import analyze ограничить размер и частоту multipart-запросов; для template/report операций добавить лимиты на пользователя/IP.

#### P1-2. Публичный health endpoint раскрывает инфраструктурные параметры

- [`apps/web/src/app/api/system/health/route.ts`](../apps/web/src/app/api/system/health/route.ts:54) не выполняет auth/RBAC и не имеет rate limit.
- При `!isInstalled || isAdmin` endpoint возвращает `cwd`, `dbHost`, `dbPort`, `uploadDirPath` и системные сведения ([`apps/web/src/app/api/system/health/route.ts`](../apps/web/src/app/api/system/health/route.ts:212)).
- Хотя диагностические детали скрываются для установленной системы без admin, сам маршрут выполняет TCP probe и Prisma probe для любого вызывающего.

**Риск:** раскрытие топологии, путей файловой системы и availability-информации; возможность дешевого сетевого probing.
**Действие:** разделить public liveness и authenticated/admin diagnostics; не возвращать host/path в public response; добавить rate limiting и корректные cache headers.

#### P1-3. Небезопасная передача внутренних ошибок в отдельных API

Подтверждено прямое включение `error.message` в ответы:

- [`apps/web/src/app/api/mro/schedules/[id]/route.ts`](../apps/web/src/app/api/mro/schedules/[id]/route.ts:168) возвращает `error.message` с HTTP 500.
- [`apps/web/src/app/api/admin/database/dump/route.ts`](../apps/web/src/app/api/admin/database/dump/route.ts:47) возвращает переменную `message`, производную от исключения.
- [`apps/web/src/app/api/srm/issues/route.ts`](../apps/web/src/app/api/srm/issues/route.ts:153) возвращает `error.message`.
- [`apps/web/src/app/api/eps/documents/route.ts`](../apps/web/src/app/api/eps/documents/route.ts:209) возвращает `error.message` и определяет статус по тексту исключения.
- [`apps/web/src/app/api/eps/custom-sections/route.ts`](../apps/web/src/app/api/eps/custom-sections/route.ts:110) и [`apps/web/src/app/api/eps/custom-sections/route.ts`](../apps/web/src/app/api/eps/custom-sections/route.ts:201) возвращают `error.message`.
- [`apps/web/src/app/api/setup/status/route.ts`](../apps/web/src/app/api/setup/status/route.ts:238) возвращает `details: error.message`.

**Риск:** раскрытие URL, структуры интеграций, SQL/ORM/драйверных деталей, путей и внутренних причин отказа.
**Действие:** использовать [`toSafeErrorDetails()`](../apps/web/src/lib/safe-error.ts:1) или единый безопасный response helper; логировать полную причину с correlation ID, клиенту возвращать стабильное обобщенное сообщение. Валидационные ошибки 400 разрешать только после фильтрации безопасных полей.

### P2 — средний приоритет

#### P2-1. API inventory показывает публичные маршруты без очевидной auth-сигнатуры

Статический inventory не нашел `requireAuth`, `getCurrentUser`, `hasPermission` или `verifySetupAccess` в:

- [`apps/web/src/app/api/admin/settings/test-jira/route.ts`](../apps/web/src/app/api/admin/settings/test-jira/route.ts:6) — это thin wrapper, делегирующий в [`apps/web/src/app/api/admin/settings/test-srm/route.ts`](../apps/web/src/app/api/admin/settings/test-srm/route.ts:1), поэтому фактическая проверка есть, но защиту трудно обнаружить статическим правилом.
- [`apps/web/src/app/api/auth/login/route.ts`](../apps/web/src/app/api/auth/login/route.ts:1) — публичный маршрут по назначению, защищен rate limit.
- [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/[id]/route.ts:15) — публичный по назначению, защищен секретом интеграции и rate limit.
- [`apps/web/src/app/api/system/health/route.ts`](../apps/web/src/app/api/system/health/route.ts:54) — public health/diagnostics, требует отдельной политики из P1-2.

**Действие:** добавить явные route-level комментарии/общие wrappers для intentional public endpoints и автоматический тест inventory, проверяющий фактические auth/rate-limit invariants.

#### P2-2. Чрезмерное использование `any` в production API

Inventory обнаружил **178 вхождений `any`** в [`apps/web/src/app/api`](../apps/web/src/app/api). Примеры: [`apps/web/src/app/api/eps/import/analyze/route.ts`](../apps/web/src/app/api/eps/import/analyze/route.ts:84), [`apps/web/src/app/api/eps/reports/generate/route.ts`](../apps/web/src/app/api/eps/reports/generate/route.ts:106), [`apps/web/src/app/api/dashboard/stats/route.ts`](../apps/web/src/app/api/dashboard/stats/route.ts:27).

**Риск:** отсутствие type narrowing для пользовательских JSON/XLSX данных, скрытые runtime-ошибки и слабая проверка контрактов API.
**Действие:** заменить `any` на `unknown`, Zod/typed DTO и Prisma input types; оставить исключения только для действительно нестабильных внешних схем с локальным адаптером.

#### P2-3. Дизайн-система нарушена массовым hardcode цветов

- [`scripts/check-theme-tokens.mjs`](../scripts/check-theme-tokens.mjs:7) проверяет только hex в пределах одной строки с `sx=`, `iconColor=`, `accentColor=` или `bgcolor:` и возвращает exit code 0 даже при найденных нарушениях ([`scripts/check-theme-tokens.mjs`](../scripts/check-theme-tokens.mjs:49)). Поэтому `pnpm check:theme` информирует, но не блокирует CI.
- Проверка обнаружила 595 usages; примеры: [`apps/web/src/app/admin/audit-log/page.tsx`](../apps/web/src/app/admin/audit-log/page.tsx:206), [`apps/web/src/components/ui/ErrorState.tsx`](../apps/web/src/components/ui/ErrorState.tsx:70), [`apps/web/src/components/wms/WarehouseTopologyModal.tsx`](../apps/web/src/components/wms/WarehouseTopologyModal.tsx:367).
- Общий grep исходников обнаружил 1 860 hex-вхождений, включая места вне текущего узкого шаблона.

**Риск:** нарушение themeability, несогласованный UX и невозможность надежно контролировать правило в CI.
**Действие:** сделать checker fail-fast с ненулевым exit code, исключить только утвержденные theme definition files, мигрировать shared UI и высокопосещаемые страницы на `theme.palette.*`/semantic tokens, добавить CI gate.

#### P2-4. Обслуживание файлов требует повторной проверки resource-level authorization

Текущий audit подтвердил наличие directory traversal защиты и отдельные тесты в [`apps/web/src/lib/file-access.ts`](../apps/web/src/lib/file-access.ts:1) и [`apps/web/src/lib/__tests__/file-access.test.ts`](../apps/web/src/lib/__tests__/file-access.test.ts:1). Однако при изменениях маршрута необходимо сохранять проверку принадлежности файла ресурсу в [`apps/web/src/app/api/files/[...path]/route.ts`](../apps/web/src/app/api/files/[...path]/route.ts:1), а не только authentication/path safety.

**Действие:** держать regression tests для чужого document/photo/attachment, traversal, symlink и deleted resource; проверять, что route использует централизованный helper и domain permissions.

### P3 — качество и сопровождаемость

#### P3-1. 40 frontend-файлов получили оценку F и нарушают обязательные пороги

Наиболее тяжелые файлы по автоматическому анализу:

| Файл | Метрики | Приоритет |
|---|---|---|
| [`apps/web/src/app/eps/[id]/page.tsx`](../apps/web/src/app/eps/%5Bid%5D/page.tsx:1) | 2 024 строки; `handleCopy` 1 401 строка; 102 smells | P1 refactor |
| [`apps/web/src/app/eps/page.tsx`](../apps/web/src/app/eps/page.tsx:1) | 1 623 строки; `handleBulkPrint` 1 167 строк; complexity 95 | P1 refactor |
| [`apps/web/src/app/eps/approvals/page.tsx`](../apps/web/src/app/eps/approvals/page.tsx:1) | 1 298 строк; `handleProcessReview` 918 строк; complexity 40 | P1 refactor |
| [`apps/web/src/components/layout/Sidebar.tsx`](../apps/web/src/components/layout/Sidebar.tsx:1) | 1 429 строк; `handleLogout` 301 строк; complexity 47 | P1 refactor |
| [`apps/web/src/app/wms/operations/page.tsx`](../apps/web/src/app/wms/operations/page.tsx:1) | 1 072 строки; `renderRecipientBadge` 730 строк; complexity 49 | P1 refactor |
| [`apps/web/src/app/setup/page.tsx`](../apps/web/src/app/setup/page.tsx:1) | 856 строк; handlers >50 строк | P2 refactor |
| [`apps/web/src/components/eps/EquipmentWizardForm.tsx`](../apps/web/src/components/eps/EquipmentWizardForm.tsx:1) | 843 строки; render/handler >50 строк | P2 refactor |
| [`apps/web/src/components/eps/SmartImportWizard.tsx`](../apps/web/src/components/eps/SmartImportWizard.tsx:1) | 820 строк; handlers >50 строк | P2 refactor |
| [`packages/database/src/seed.ts`](../packages/database/src/seed.ts:1) | 968 строк; grade F | P2 refactor |
| [`packages/auth/src/eps.test.ts`](../packages/auth/src/eps.test.ts:1) | 549 строк; grade F | P3 test refactor |
| [`packages/auth/src/ldap.ts`](../packages/auth/src/ldap.ts:1) | 408 строк; grade F, 52/100 | P1 security refactor |

**Действие:** декомпозировать по hooks/services/render components, ограничить функции 50 строками и complexity 10, передавать конфигурацию объектом при >5 параметрах, устранять deep nesting и `any`. Для [`packages/auth/src/ldap.ts`](../packages/auth/src/ldap.ts:1) сохранить текущие `escapeLdapFilter()` regression tests при выделении transport/config/filter helpers.

#### P3-2. Large unbounded reads и тяжёлые операции требуют budget controls

В webhook [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/%5Bid%5D/route.ts:69) используется `findMany` оборудования без видимого limit; import/report маршруты работают с пользовательскими файлами и большими коллекциями. Сейчас webhook защищен rate limit и обязательным secret ([`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/%5Bid%5D/route.ts:17), [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/%5Bid%5D/route.ts:54)), но защита от payload-size/replay и bounded processing не зафиксирована.

**Действие:** ввести максимальный размер body/file, лимит строк/колонок, pagination/selection для lookup, idempotency/event ID для webhook и timeout budget для внешних вызовов.

## Security controls, которые подтверждены

- [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/%5Bid%5D/route.ts:41) использует корректную проверку обязательного token: отсутствующий или несовпадающий секрет дает 401.
- [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/%5Bid%5D/route.ts:17) имеет per-integration rate limit.
- LDAP filter values экранируются через `escapeLdapFilter()` в [`packages/auth/src/ldap.ts`](../packages/auth/src/ldap.ts:95), [`packages/auth/src/ldap.ts`](../packages/auth/src/ldap.ts:147), [`packages/auth/src/ldap.ts`](../packages/auth/src/ldap.ts:212) и [`packages/auth/src/ldap.ts`](../packages/auth/src/ldap.ts:321).
- Raw SQL ограничен template-literal health checks в [`apps/web/src/app/api/setup/test-db/route.ts`](../apps/web/src/app/api/setup/test-db/route.ts:60) и [`apps/web/src/app/api/system/health/route.ts`](../apps/web/src/app/api/system/health/route.ts:86).
- JWT реализован через `jose` и env secret в [`packages/auth/src/jwt.ts`](../packages/auth/src/jwt.ts:1); root [`tsconfig.json`](../tsconfig.json:1) включает `strict: true`.
- Shared UI exports централизованы в [`apps/web/src/components/ui/index.ts`](../apps/web/src/components/ui/index.ts:1), включая `StatusBadge`, `StatCard`, `SearchInput`, `FilterToolbar`, `EmptyState`, `ConfirmDialog` и `DataTableWrapper`.
- Предыдущие исправления SSRF/resource-level file access/safe errors покрыты актуальными regression tests, включая [`apps/web/src/lib/__tests__/outbound-url.test.ts`](../apps/web/src/lib/__tests__/outbound-url.test.ts:1), [`apps/web/src/lib/__tests__/file-access.test.ts`](../apps/web/src/lib/__tests__/file-access.test.ts:1) и [`apps/web/src/lib/__tests__/safe-error.test.ts`](../apps/web/src/lib/__tests__/safe-error.test.ts:1).

## План remediation

1. **Немедленно:** обновить Next.js, `eslint-config-next`, PostCSS и `xlsx`; повторить `pnpm audit` и проверить lockfile. Для транзитивного `deepmerge-ts` обновить Prisma-цепочку либо документировать временное исключение.
2. **P1:** добавить rate limit на все sensitive routes из inventory; закрыть public health diagnostics и стабилизировать public liveness contract.
3. **P1:** убрать все 5xx `error.message`/`details` из API response и унифицировать safe error handling.
4. **P2:** сделать [`scripts/check-theme-tokens.mjs`](../scripts/check-theme-tokens.mjs:1) CI-blocking и начать миграцию hardcoded colors с shared UI и admin/audit/WMS экранов.
5. **P1/P2:** декомпозировать F-файлы, начиная с EPS detail/list/approvals, Sidebar, LDAP и наиболее сложных WMS компонентов.
6. **P2:** заменить `any` в API boundary на `unknown` + schemas/DTO; добавить bounded processing для XLSX, reports и webhooks.
7. **CI:** выполнять `pnpm db:generate` до тестов, затем `pnpm lint`, `pnpm --filter @ems/web exec tsc --noEmit`, `pnpm test`, `pnpm check:theme`, quality checker и `pnpm audit --audit-level=high`.
8. **Regression:** сохранить тесты webhook secret absence, rate-limit exhaustion, safe errors, LDAP escaping, SSRF/private IP rejection и resource-level file isolation.

## Требуемый критерий повторной приемки

Инспекция может быть закрыта только после:

- отсутствия critical/high dependency vulnerabilities либо утвержденного security exception;
- нулевого exit code всех обязательных CI gates, включая theme checker;
- отсутствия новых F-файлов в измененном scope;
- наличия rate limit на всех маршрутах из security matrix;
- отсутствия внутренних exception details в 5xx API responses;
- прохождения полного тестового набора и regression tests для auth, webhook, LDAP, SSRF и file access.
