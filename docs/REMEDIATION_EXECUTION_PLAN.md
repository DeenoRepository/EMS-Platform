# EMS-Platform — план поэтапного исправления замечаний

**Дата плана:** 2026-08-28  
**Источник:** [`docs/PROJECT_INSPECTION_2026-08-28.md`](PROJECT_INSPECTION_2026-08-28.md), [`AGENTS.md`](../AGENTS.md), [`security.md`](../.agents/rules/security.md), [`ui_design_code.md`](../.agents/rules/ui_design_code.md), [`code_quality.md`](../.agents/rules/code_quality.md), [`skills_usage.md`](../.agents/rules/skills_usage.md)  
**Цель:** безопасно довести проект от текущего baseline с блокирующими P0/P1 findings до повторной приемки, не ломая рабочие сценарии EPS/WMS/SRM/MRO/Admin.

---

## 1. Базовые правила для всех агентов

### 1.1. Обязательный порядок работы

Каждая задача выполняется циклом:

1. **Discuss:** прочитать постановку, текущий finding и связанные правила.
2. **Map:** прочитать целевые файлы полностью, найти импорты, callers, тесты и контракты.
3. **Decompose:** определить минимальный scope, не смешивать security, UI и крупный refactor в одном PR.
4. **Execute:** внести атомарные изменения без выдуманных API; использовать существующие helpers/types.
5. **Verify:** выполнить тесты/линт/typecheck/quality scan, проверить diff и отсутствие секретов.
6. **Commit:** сделать отдельный Conventional Commit после успешного логического этапа.
7. **Handoff:** передать следующий агенту commit SHA, измененные файлы, команды и оставшиеся риски.

Перед каждой крупной coding-задачей агент обязан загрузить [`zero-hallucination-coder`](../.agents/skills/zero-hallucination-coder/SKILL.md). Дополнительный skill выбирается по области:

| Область | Обязательные skills |
|---|---|
| Security/auth/API | [`senior-security`](../.agents/skills/senior-security/SKILL.md), [`senior-backend`](../.agents/skills/senior-backend/SKILL.md), [`strict-api`](../.agents/skills/strict-api/SKILL.md) |
| Dependencies/CI/containers | [`senior-secops`](../.agents/skills/senior-secops/SKILL.md), [`ci-cd-pipeline-builder`](../.agents/skills/ci-cd-pipeline-builder/SKILL.md), [`docker-development`](../.agents/skills/docker-development/SKILL.md) при изменении Docker |
| UI/theme | [`senior-frontend`](../.agents/skills/senior-frontend/SKILL.md), [`a11y-audit`](../.agents/skills/a11y-audit/SKILL.md) |
| Refactoring | [`senior-architect`](../.agents/skills/senior-architect/SKILL.md), [`code-reviewer`](../.agents/skills/code-reviewer/SKILL.md) |
| Tests | [`senior-qa`](../.agents/skills/senior-qa/SKILL.md), [`playwright-pro`](../.agents/skills/playwright-pro/SKILL.md) для E2E |

### 1.2. Запреты и инварианты

- Не использовать raw SQL кроме разрешенных template-literal health probes `SELECT 1`.
- Каждый защищенный API route обязан применять permission-aware [`requireAuth()`](../apps/web/src/lib/auth-guard.ts:1) или эквивалентную проверку `hasPermission()`.
- Для webhook при настроенном секрете использовать строго `!providedToken || providedToken !== webhookSecret`.
- Для LDAP пользовательские значения пропускать через `escapeLdapFilter()`.
- Не возвращать `error.message`, stack, URL интеграции, пути или SQL детали в 5xx response.
- Для rate-limited endpoints использовать [`enforceRateLimit()`](../apps/web/src/lib/rate-limit.ts:1) с уникальным prefix.
- Для типового UI использовать exports из [`apps/web/src/components/ui/index.ts`](../apps/web/src/components/ui/index.ts:1); статусы — [`StatusBadge`](../apps/web/src/components/ui/StatusBadge.tsx:1), KPI — [`StatCard`](../apps/web/src/components/ui/StatCard.tsx:1), таблицы — [`DataTableWrapper`](../apps/web/src/components/ui/DataTableWrapper.tsx:1).
- Не добавлять hex-цвета в `sx`, `iconColor`, `accentColor` и аналогичные пропы; применять theme semantic tokens.
- Не увеличивать функции выше 50 строк, complexity выше 10, файлы выше 500 строк в изменяемом scope.
- После каждого логического этапа — `git commit` с Conventional Commit message.

### 1.3. Унифицированная проверка агента

Минимальный набор команд из корня проекта:

```bash
pnpm --filter @ems/database generate
pnpm lint
pnpm --filter @ems/web exec tsc --noEmit
pnpm test
pnpm check:theme
python3 .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --recursive --language typescript --json > /tmp/ems-web-quality.json
python3 .agents/skills/code-reviewer/scripts/code_quality_checker.py packages --recursive --language typescript --json > /tmp/ems-packages-quality.json
pnpm audit --audit-level=high

git diff --check
git status --short
```

`pnpm check:theme` обязан завершаться ненулевым кодом при найденном violation после фазы 5. До этого агент должен явно записывать количество нарушений в handoff.

---

## 2. Целевое состояние и gate criteria

Релизный remediation gate считается пройденным, когда:

1. Нет critical/high dependency vulnerabilities либо есть подписанный security exception с owner, сроком истечения и compensating controls.
2. `pnpm lint`, typecheck, tests, production build и theme check проходят.
3. Все маршруты из security matrix имеют auth/RBAC и нужный rate limit; intentional public endpoints документированы и протестированы.
4. В 5xx API response отсутствуют внутренние exception details.
5. Webhook, LDAP, SSRF, file isolation и setup authorization имеют regression tests.
6. В измененном scope нет новых F-файлов; средний quality score растет, а complexity/file-size thresholds соблюдаются.
7. Shared UI migration не ухудшает keyboard navigation, focus state, contrast и responsive behavior.
8. Каждый этап имеет атомарный commit и проверяемый handoff.

---

## 3. Зависимости фаз и параллелизация

```text
Фаза 0 Baseline
   ├── Фаза 1 Dependency/security unblock ──┐
   ├── Фаза 2 API security hardening ───────┼──> Фаза 6 integrated verification
   ├── Фаза 3 Test/regression foundation ───┘              │
   ├── Фаза 4 UI policy + migration ───────────────┐      │
   └── Фаза 5 bounded refactoring ─────────────────┴──────┘
```

- Фаза 0 блокирует старт остальных.
- Фазы 1, 2 и 3 можно вести параллельно после фиксации baseline, но dependency upgrades сначала проверяются отдельным агентом.
- Фаза 4 начинается после фиксации theme token policy и checker contract.
- Фаза 5 запускается по bounded stories после API/security стабилизации; разные домены можно параллелить только при непересекающихся файлах.
- Фаза 6 всегда выполняется последней на чистом checkout.

---

# Фаза 0 — Baseline, scope lock и распределение работ

**Цель:** зафиксировать воспроизводную точку отсчета и не повторять уже закрытые finding как новые.

**Owner:** Orchestrator/lead reviewer.  
**Skills:** `code-reviewer`, `senior-architect`, `zero-hallucination-coder`.

## Шаги

1. Проверить `git status`, текущую ветку и последний remediation commit.
2. Запустить базовые команды из §1.3 и сохранить артефакты в `/tmp` или versioned docs только по необходимости.
3. Сверить факты с [`docs/PROJECT_INSPECTION_2026-08-28.md`](PROJECT_INSPECTION_2026-08-28.md) и не считать уже исправленные webhook secret, LDAP escaping, file access и safe-error tests повторными finding без доказательств регрессии.
4. Создать issue matrix с полями: ID, severity, owner, files, dependency, tests, acceptance, status, commit SHA.
5. Разделить worktrees/branches или строго непересекающиеся scopes.

**Deliverable:** baseline matrix и подтвержденные цифры quality/audit/theme.  
**Gate:** clean baseline, все work items назначены.  
**Commit:** `docs: define remediation execution baseline`.

---

# Фаза 1 — P0 Dependency and supply-chain unblock

**Цель:** закрыть critical/high advisories до функциональных рефакторингов.

**Owner:** SecOps/Dependency agent.  
**Skills:** `senior-secops`, `ci-cd-pipeline-builder`, `zero-hallucination-coder`; `docker-development` при изменении production image.

## Шаг 1.1 — Next.js и согласованные пакеты

1. Проверить advisory details и compatibility для текущих Next.js 14 App Router, React 18 и middleware.
2. Обновить `next` и `eslint-config-next` минимум до совместимой patched-версии, закрывающей critical advisory и применимые high advisories; не делать major upgrade без отдельного ADR.
3. Обновить lockfile через pnpm, не редактировать его вручную.
4. Проверить middleware, route handlers, server actions, image config, rewrites и production build.
5. Добавить smoke test на auth middleware и unauthorized/forbidden API behavior.

**Gate:** critical Next advisory отсутствует; build и auth smoke проходят.  
**Commit:** `chore(deps): patch Next.js security advisories`.

## Шаг 1.2 — XLSX/PostCSS/Prisma transitive chain

1. Проверить потребителей [`xlsx`](../apps/web/src/app/api/eps/import/analyze/route.ts:1) и [`xlsx`](../apps/web/src/app/api/eps/import/template/route.ts:6), совместимость с patched release и возможные breaking changes.
2. Обновить `xlsx` до версии, закрывающей Prototype Pollution и ReDoS; ограничить размер файла/листов/строк до upgrade и после него.
3. Обновить PostCSS через совместимый Next toolchain.
4. Для `deepmerge-ts` определить, какая версия Prisma поддерживает patched chain; обновить Prisma packages атомарно, выполнить generate и проверить schema/migrations.
5. Повторить `pnpm audit --audit-level=high`; для остатка оформить exception вместо молчаливого игнорирования.

**Gate:** нет critical/high без documented exception; `pnpm db:generate`, tests и build проходят.  
**Commit:** `chore(deps): remediate xlsx postcss and prisma advisories`.

## Шаг 1.3 — Supply-chain policy

1. Проверить lockfile integrity, direct vs transitive dependencies и production image contents.
2. Настроить Dependabot так, чтобы security updates не блокировались общим ignore major policy; security PR обрабатываются отдельно.
3. Добавить CI job `pnpm audit --audit-level=high` с понятной политикой exception.
4. Не сохранять токены/секреты в workflow; текущий CI dummy `JWT_SECRET` оставить только как тестовый placeholder, не переиспользовать в production.

**Gate:** повторный audit и CI behavior документированы.  
**Commit:** `chore(ci): enforce dependency security gate`.

---

# Фаза 2 — P1 API security hardening

**Цель:** закрыть rate limit, safe errors, public health exposure и подтвердить RBAC matrix.

**Owner:** Backend/Security agent.  
**Skills:** `senior-backend`, `senior-security`, `strict-api`, `zero-hallucination-coder`.

## Шаг 2.1 — Rate-limit matrix

Проверить и реализовать limiter для:

- [`apps/web/src/app/api/eps/import/analyze/route.ts`](../apps/web/src/app/api/eps/import/analyze/route.ts:324) — multipart/XLSX analysis;
- [`apps/web/src/app/api/eps/import/template/route.ts`](../apps/web/src/app/api/eps/import/template/route.ts:10);
- [`apps/web/src/app/api/eps/reports/templates/route.ts`](../apps/web/src/app/api/eps/reports/templates/route.ts:9);
- [`apps/web/src/app/api/eps/reports/templates/[id]/route.ts`](../apps/web/src/app/api/eps/reports/templates/%5Bid%5D/route.ts:1);
- [`apps/web/src/app/api/setup/status/route.ts`](../apps/web/src/app/api/setup/status/route.ts:75);
- оценить [`apps/web/src/app/api/auth/logout/route.ts`](../apps/web/src/app/api/auth/logout/route.ts:1) и [`apps/web/src/app/api/auth/me/route.ts`](../apps/web/src/app/api/auth/me/route.ts:1) по abuse model;
- все sensitive routes, обнаруженные inventory, а не только список выше.

Для каждого endpoint определить limit/window/prefix/key: IP, user ID, integration ID или комбинация. Не копировать один лимит вслепую.

**Tests:** 429 после исчерпания quota, разные prefixes не делят bucket, failed auth не обходится через другой key.  
**Commit:** `fix(security): enforce rate limits across sensitive API routes`.

## Шаг 2.2 — Health endpoint policy

1. Разделить public liveness response от admin diagnostics.
2. Public response должен сообщать только минимальный статус (`ok`/`degraded`) без `cwd`, `dbHost`, `dbPort`, `uploadDirPath`, platform и memory details.
3. Admin diagnostics — только после permission-aware auth; не полагаться на наличие роли без permission policy.
4. Убедиться, что Prisma query failure дает `degraded/unreachable`, а не healthy.
5. Добавить timeout cleanup для probes и `Cache-Control: no-store`.

**Tests:** public response не содержит infrastructure fields; unauthorized diagnostics получают 401/403; DB query failure не маскируется.  
**Commit:** `fix(security): restrict health diagnostics and classify probe failures`.

## Шаг 2.3 — Safe errors

1. Найти все API `error.message`, `err.message`, `details: error.message`, а не только перечисленные finding.
2. Для 5xx использовать [`toSafeErrorDetails()`](../apps/web/src/lib/safe-error.ts:1) или общий helper: внутреннее сообщение только в structured logger, public message стабилен.
3. Для expected 400 использовать typed domain/validation errors вместо сравнения текста исключения.
4. Обязательное `catch (error: unknown)` и narrowing.
5. Не логировать secrets, auth headers, API tokens и полные request bodies.

**Tests:** injected Error с секретоподобным текстом не возвращается клиенту; server logger получает correlation ID; validation 400 сохраняет безопасное сообщение.  
**Commit:** `fix(api): hide internal exception details from error responses`.

## Шаг 2.4 — RBAC and route inventory

1. Составить таблицу всех 85 route handlers: method, public/private, permission, limiter, CSRF/content-type behavior.
2. Для каждого private route подтвердить `requireAuth(req, PERMISSIONS.*)` или equivalent permission check.
3. Для thin wrappers вроде `test-jira` добавить явное описание delegated security contract либо общий wrapper, который делает policy видимой.
4. Особо проверить `/api/users`, EPS dictionaries, setup after installation, downloads/dumps, reports/imports и SRM diagnostics.
5. Сохранить resource-level authorization для files и ownership/domain checks.

**Tests:** anonymous 401, authenticated-no-permission 403, permitted request success, cross-tenant/resource denial.  
**Commit:** `fix(security): complete API authorization matrix and route guards`.

## Шаг 2.5 — Bounded processing and SSRF regression

1. Для XLSX endpoints задать max body size, max rows/columns/sheets и safe parsing options.
2. Для webhook определить event ID/idempotency key, max body size и bounded equipment lookup; не делать неограниченный `findMany` без обоснования.
3. Сохранить URL validation/SSRF protections для LDAP/SRM diagnostic routes, including DNS rebinding-safe resolution, timeout и redirect policy.
4. Сохранить file traversal + resource authorization + symlink policy.

**Tests:** oversized file/body rejected, excessive rows rejected, repeated event idempotent, private/link-local URL denied, redirect denied, foreign file denied.  
**Commit:** `fix(security): bound import webhook and outbound processing`.

---

# Фаза 3 — Test and CI foundation

**Цель:** сделать regression suite и CI надежными до массовых refactors.

**Owner:** QA/CI agent.  
**Skills:** `senior-qa`, `playwright-pro`, `ci-cd-pipeline-builder`, `senior-secops`.

## Шаг 3.1 — Test environment hygiene

1. Перед test запуском генерировать Prisma Client, как уже делает [`ci.yml`](../.github/workflows/ci.yml:38).
2. В unit test environment задать безопасный dummy `DATABASE_URL`, чтобы Prisma не печатал misleading missing-env errors; не подключаться к реальной БД.
3. Устранить шумные expected error logs или пометить их как intentional test output.
4. Зафиксировать coverage baseline по `packages/auth`, security helpers и API helpers.

**Commit:** `test: stabilize isolated prisma and auth test environment`.

## Шаг 3.2 — Security regression tests

Добавить/расширить tests для:

- webhook: absent/wrong/correct secret, rate limit, replay/idempotency;
- RBAC: 401/403/success на users, dictionaries, diagnostics, reports/imports;
- safe errors: no internal details in 5xx;
- health: public minimal payload, admin diagnostics, degraded DB probe;
- LDAP escaping and private target rejection;
- outbound URL SSRF, redirect and DNS resolution policy;
- file access traversal, symlink, deleted/foreign resource;
- XLSX limits and malformed workbook handling.

**Commit:** `test: add API security and bounded processing regressions`.

## Шаг 3.3 — CI gates

Обновить [`ci.yml`](../.github/workflows/ci.yml:13) так, чтобы job выполняла в порядке:

1. install frozen lockfile;
2. Prisma generate;
3. lint;
4. typecheck;
5. unit/integration tests;
6. theme checker;
7. quality scan and F-file threshold for changed scope;
8. dependency audit;
9. production build;
10. optional Playwright smoke stage с изолированными services.

Ошибки должны быть actionable, артефакты quality/audit отчета — сохраняться в CI. Не выставлять секреты через hardcoded production values.

**Commit:** `ci: enforce remediation quality security and test gates`.

---

# Фаза 4 — UI design-system remediation

**Цель:** устранить hardcoded colors и стандартизировать shared controls без регрессии UX.

**Owner:** Frontend/UI agent.  
**Skills:** `senior-frontend`, `a11y-audit`, `zero-hallucination-coder`.

## Шаг 4.1 — Token contract

1. Прочитать текущую theme definition и определить допустимые semantic tokens, включая dark/sidebar/chart use cases.
2. Решить, какие специфичные токены нужно добавить в theme, вместо подстановки неподходящих `grey.*`.
3. Обновить [`check-theme-tokens.mjs`](../scripts/check-theme-tokens.mjs:1): корректно сканировать multiline `sx`, `sx={() => ({})}`, `bgcolor`, `iconColor`, `accentColor`, не сканировать только `__tests__` и утвержденный theme source.
4. Возвращать exit code 1 при violations; добавить fixture с нарушением и clean fixture.
5. CI должен запускать checker как blocking gate.

**Commit:** `chore(ui): make theme token checker enforceable`.

## Шаг 4.2 — Shared UI first

Мигрировать сначала shared components, затем страницы:

1. [`apps/web/src/components/ui/StatCard.tsx`](../apps/web/src/components/ui/StatCard.tsx:1), [`StatusBadge.tsx`](../apps/web/src/components/ui/StatusBadge.tsx:1), [`ErrorState.tsx`](../apps/web/src/components/ui/ErrorState.tsx:1), [`DataTableWrapper.tsx`](../apps/web/src/components/ui/DataTableWrapper.tsx:1);
2. Sidebar/login/FeedbackDialog/admin audit and users;
3. WMS/MRO/EPS/SRM high-traffic components;
4. remaining files by checker count.

Для каждой партии:

- заменить colors на palette/semantic tokens или theme callback;
- не заменять реальные SVG/print-specific colors без визуальной проверки;
- заменить entity-status `<Chip>` на [`StatusBadge`](../apps/web/src/components/ui/StatusBadge.tsx:1), нейтральные IDs/tags/chips оставить;
- проверить keyboard/focus/contrast и responsive layout;
- запустить checker и targeted UI tests.

**Commit per bounded batch:** `refactor(ui): migrate <scope> to semantic theme tokens`.

## Шаг 4.3 — Shared control adoption

Проверить pages на самописные:

- KPI cards → `StatCard`;
- status labels → `StatusBadge`;
- live search → `SearchInput`;
- filter panels → `FilterToolbar`;
- empty states → `EmptyState`;
- tables → `DataTableWrapper`;
- destructive confirmation → `ConfirmDialog`.

Не делать механическую замену: сверять prop contracts, loading/error states, accessibility labels и domain status map.

**Commit:** `refactor(ui): standardize shared controls across audited screens`.

---

# Фаза 5 — Quality and architecture refactoring

**Цель:** убрать F-файлы и наиболее рискованные complexity/size violations bounded stories.

**Owner:** Domain refactor agents под координацией Architect.  
**Skills:** `senior-architect`, `senior-frontend` для UI, `senior-backend` для API, `code-reviewer`, `zero-hallucination-coder`.

## Шаг 5.1 — LDAP/auth core

Файл: [`packages/auth/src/ldap.ts`](../packages/auth/src/ldap.ts:1).

1. Зафиксировать public exports и tests.
2. Выделить config parsing, connection/timeout, filter escaping, user mapping и error classification.
3. Все пользовательские фильтры оставить через `escapeLdapFilter()`.
4. Не менять auth semantics без security review.
5. Сохранить/расширить tests и добиться complexity ≤10 на функцию.

**Commit:** `refactor(auth): decompose LDAP authentication into focused helpers`.

## Шаг 5.2 — EPS detail/list/approvals

Обрабатывать отдельными PR, не объединять три страницы:

- [`apps/web/src/app/eps/[id]/page.tsx`](../apps/web/src/app/eps/%5Bid%5D/page.tsx:1): выделить custom field renderer, document/photo actions, detail sections, data hooks; не повторять extraction, если функция реально уже короткая.
- [`apps/web/src/app/eps/page.tsx`](../apps/web/src/app/eps/page.tsx:1): выделить table/query state, export/print workflow, filters and dialogs; print logic only if manual inspection confirms actual complexity.
- [`apps/web/src/app/eps/approvals/page.tsx`](../apps/web/src/app/eps/approvals/page.tsx:1): вынести workflow/form steps и strategy map; сохранить approval status transitions and audit.

Для каждой страницы:

1. прочитать файл целиком;
2. зафиксировать behavior tests/screenshot or Playwright smoke;
3. выделить pure functions/hooks/components;
4. проверить imports/circular dependencies;
5. quality scan измененного scope;
6. lint/typecheck/test/build;
7. отдельный commit.

## Шаг 5.3 — Layout and WMS

- [`apps/web/src/components/layout/Sidebar.tsx`](../apps/web/src/components/layout/Sidebar.tsx:1): разделять только после dependency map; не ломать navigation, permissions, responsive flyout и logout.
- [`apps/web/src/app/wms/operations/page.tsx`](../apps/web/src/app/wms/operations/page.tsx:1): вынести recipient badge mapping и operation actions.
- [`apps/web/src/components/wms/WmsOperationWizardDialog.tsx`](../apps/web/src/components/wms/WmsOperationWizardDialog.tsx:1): step components + state hook, сохранить validation and submit transaction semantics.
- [`apps/web/src/app/wms/stock/page.tsx`](../apps/web/src/app/wms/stock/page.tsx:1) и warehouses: разделить data/query/render concerns.

**Commit per domain:** `refactor(wms|layout): decompose <scope> into focused components`.

## Шаг 5.4 — Setup, seed and remaining F modules

- [`apps/web/src/app/setup/page.tsx`](../apps/web/src/app/setup/page.tsx:1): использовать существующие setup components, вынести wizard state/actions, сохранить post-install admin guard.
- [`packages/database/src/seed.ts`](../packages/database/src/seed.ts:1): выделить seed groups/constants/idempotent helpers, не менять permission defaults без RBAC review.
- [`packages/auth/src/eps.test.ts`](../packages/auth/src/eps.test.ts:1): разделить suites/fixtures без снижения coverage.
- Остальные F-файлы обрабатывать по quality ranking, только после P0/P1 security gates.

**Commit per bounded story:** `refactor(setup|database|test): decompose <scope>`.

## Шаг 5.5 — API route decomposition and types

1. Разбить крупные handlers `custom-sections`, `wms/transfers`, import/report routes на validation/service/query/response helpers.
2. Заменить boundary `any` на `unknown`, Zod schemas и Prisma generated input types.
3. Оставить legacy external API `any` только внутри adapter boundary с комментарием и typed normalized output.
4. Проверить transaction boundaries и N+1 queries после выделения.

**Commit:** `refactor(api): separate validation domain logic and response mapping`.

---

# Фаза 6 — Integrated verification, acceptance and closeout

**Цель:** доказать, что remediation работает как единое состояние, а не только по отдельным PR.

**Owner:** Lead reviewer/QA/SecOps.  
**Skills:** `code-reviewer`, `senior-secops`, `senior-qa`, `playwright-pro`, `a11y-audit`.

## Шаг 6.1 — Clean-room verification

На чистом checkout/CI runner:

```bash
pnpm install --frozen-lockfile
pnpm --filter @ems/database generate
pnpm lint
pnpm --filter @ems/web exec tsc --noEmit
pnpm test
pnpm check:theme
pnpm build
pnpm audit --audit-level=high
python3 .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --recursive --language typescript --json > docs/quality_report_final.json
python3 .agents/skills/code-reviewer/scripts/code_quality_checker.py packages --recursive --language typescript --json > docs/packages_quality_report_final.json
```

Команда аудита обязана быть осмысленно оценена: отсутствие high/critical — pass; исключения — отдельный approval artifact.

## Шаг 6.2 — Security and functional smoke

Проверить сценарии:

- login/logout/session expiry and CSRF origin checks;
- role matrix admin/manager/guest;
- equipment create/edit/document/photo/download/isolation;
- import analyze/execute/template with size limits;
- reports generation/template CRUD with quotas;
- webhook secret/rate limit/idempotency;
- LDAP diagnostic/auth with escaping and SSRF blocks;
- WMS transfer/receive/reject and MRO maintenance workflow;
- SRM integration diagnostics without token leakage;
- public health minimal response and admin diagnostics.

## Шаг 6.3 — Accessibility and UI acceptance

Для измененных UI scopes проверить:

- keyboard-only operation and visible focus;
- labels/roles for inputs, dialogs, tables and status badges;
- contrast in light/dark themes;
- loading, empty, error and disabled states;
- mobile/responsive behavior.

## Шаг 6.4 — Documentation and final commit

1. Обновить [`docs/PROJECT_INSPECTION_2026-08-28.md`](PROJECT_INSPECTION_2026-08-28.md) status, metrics, residual risks and commit list.
2. Обновить [`docs/CODE_REVIEW_AUDIT.md`](CODE_REVIEW_AUDIT.md) с датой, score и закрытыми/accepted findings.
3. Обновить [`docs/REMEDIATION_PLAN.md`](REMEDIATION_PLAN.md), если фактическая последовательность отличается.
4. Проверить `git diff --check`, чистый status после commit и отсутствие секретов в diff.
5. Финальный commit только после всех gates: `docs: close audit remediation with verified acceptance`.

---

## 4. Handoff protocol для других агентов

Каждый агент завершает сообщение/артефакт следующей структурой:

```text
Task ID:
Owner / skills loaded:
Base commit:
Result commit:
Files changed:
Behavior preserved:
Tests and commands:
Quality metrics before -> after:
Security impact:
Known residual risks:
Next recommended task:
```

Агент не должен:

- продолжать следующую фазу без подтвержденного успешного результата предыдущей;
- смешивать unrelated findings в одном commit;
- считать `lint` достаточным доказательством безопасности;
- утверждать, что finding закрыт без regression test или ручного подтверждения;
- переписывать большие файлы целиком без предварительного полного чтения и dependency map.

---

## 5. Приоритетный backlog для запуска

| Порядок | Task ID | Агент | Severity | Зависимость | Deliverable |
|---:|---|---|---|---|---|
| 1 | R0 | Lead | — | — | baseline matrix + commit |
| 2 | R1.1 | SecOps | P0 | R0 | patched Next + audit |
| 3 | R1.2 | SecOps | P0 | R1.1 | patched xlsx/PostCSS/Prisma chain |
| 4 | R2.1 | Backend Security | P1 | R0 | rate-limit matrix |
| 5 | R2.2 | Backend Security | P1 | R0 | health policy |
| 6 | R2.3 | Backend Security | P1 | R0 | safe errors |
| 7 | R3.1 | QA | P1 | R0 | isolated test baseline |
| 8 | R3.2 | QA/Security | P1 | R2.* | regression suite |
| 9 | R3.3 | CI | P1 | R1.*, R3.1 | blocking pipeline gates |
| 10 | R4.1 | Frontend | P2 | R0 | fail-fast theme checker |
| 11 | R4.2 | Frontend | P2 | R4.1 | shared UI migration batches |
| 12 | R5.1 | Auth/Architect | P1/P3 | R3.2 | LDAP decomposition |
| 13 | R5.2 | EPS agents | P3 | R3.2 | EPS bounded refactors |
| 14 | R5.3 | WMS/Layout agents | P3 | R3.2 | WMS/sidebar refactors |
| 15 | R5.4 | Setup/DB agents | P3 | R3.2 | setup/seed/test refactors |
| 16 | R6 | Lead/QA/SecOps | — | all | final clean-room acceptance |

---

## 6. Что считать закрытым, а что — deferred

### Закрыто только при доказательстве

- P0 dependency advisory — только после повторного audit.
- Rate limit — только после 429 regression test.
- RBAC — только после 401/403/success tests для нужных ролей.
- Safe error — только после negative test на внутреннее сообщение.
- Theme policy — только после checker exit code 1 на fixture и zero violations в scope.
- Refactor — только после behavior tests и quality metrics.

### Допустимо deferred с approval

- Полная миграция всех legacy UI цветов, если remaining occurrences только в официальных theme/print/SVG исключениях.
- Полная декомпозиция всех F-файлов, если измененный production scope не содержит F и есть план с owner/deadline.
- Остаточные audit advisories, только если upstream patched version несовместима и оформлен security exception с compensating controls.

Deferred item обязан содержать owner, rationale, risk, mitigation, срок пересмотра и ссылку на issue/ADR.
