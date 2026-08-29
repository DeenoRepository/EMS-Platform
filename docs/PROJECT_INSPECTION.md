# EMS-Platform — инспекция проекта

**Дата инспекции:** 2026-08-29 (повтор, HEAD `0f57ab3`)
**Ветка:** `main` @ `0f57ab3` (`docs: add bounded remediation plan from 2026-08-29 inspection`)
**Инструменты:** `code-reviewer` (`code_quality_checker.py`, `pr_analyzer.py`), [`scripts/inspect_summary.py`](../scripts/inspect_summary.py), [`scripts/fgrade_detail.py`](../scripts/fgrade_detail.py), [`scripts/route_audit.py`](../scripts/route_audit.py), [`scripts/check-theme-tokens.mjs`](../scripts/check-theme-tokens.mjs), [`scripts/check-quality-baseline.mjs`](../scripts/check-quality-baseline.mjs)
**Правила:** [`AGENTS.md`](../AGENTS.md), [`.agents/rules/security.md`](../.agents/rules/security.md), [`.agents/rules/code_quality.md`](../.agents/rules/code_quality.md), [`.agents/rules/ui_design_code.md`](../.agents/rules/ui_design_code.md), `.agents/skills/code-reviewer/rules/universal.md`, `.agents/skills/code-reviewer/languages/typescript.md`.

> **Вердикт:** Approve with suggestions. Quality baseline проходит. Критические security findings из аудита 2026-08-27 закрыты. Остаточный долг — F-grade presentation-файлы (ровно на пороге 38), local-dev секреты в `docker-compose.yml`, unsigned webhook без секрета, `console.error` на async-путях, Chip вместо `StatusBadge` в паспорте оборудования.

---

## 1. Executive summary

| Область | Текущее значение | Baseline (`check:quality`) | Статус |
|---|---|---|---|
| `apps/web/src` | 279 файлов, **78.3/100**, grade C, 2 353 smells, 25 SOLID | score ≥ 78.0, smells ≤ 2400, SOLID ≤ 25, F ≤ 38 | **PASS** |
| `packages` | 30 файлов, **94.1/100**, grade A, 74 smells, 0 SOLID | score ≥ 94.0, smells ≤ 75, SOLID = 0, F = 0 | **PASS** |
| F-grade web | **38** | ≤ 38 | **PASS** |
| F-grade packages | **0** | 0 | **PASS** |
| API routes | 85 файлов; rate-limit gap **0** | sensitive routes покрыты | **PASS** |
| Theme tokens | 0 hex вне theme-файлов | 0 | **PASS** |
| Quality tooling | in-memory runner, без root JSON | не загрязнять корень | **PASS** |
| Git | clean working tree, `pr_analyzer`: no_changes | — | **PASS** |

Распределение web-оценок: A 91 / B 71 / C 50 / D 29 / F 38.

Топ smell-типов web: `magic_number` 1911 (low), `long_function` 272 (medium), `high_complexity` 122 medium + 37 high, `commented_code` 11.

`code_quality_checker.py` по-прежнему ошибочно режет границы части TSX-функций (`handleOpenDetails` 428 строк, `handleQuickDispatch` 438, `handleExportJson` 369). Эти цифры — сигнал размера файла, не доказательство реальной длины функции. Рефакторинг только bounded stories с ручной проверкой.

---

## 2. Воспроизведённые проверки

```bash
python .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --language typescript --json
python .agents/skills/code-reviewer/scripts/code_quality_checker.py packages --language typescript --json
python .agents/skills/code-reviewer/scripts/pr_analyzer.py . --json
python scripts/inspect_summary.py
python scripts/fgrade_detail.py
python scripts/route_audit.py
node scripts/check-theme-tokens.mjs
node scripts/check-quality-baseline.mjs
```

Lint / tsc / full test / production build в этой сессии не перезапускались: рабочее дерево чистое относительно исходного HEAD, последний verification-коммит уже фиксирует outcomes. Для следующего merge-gate их нужно прогнать заново.

`fgrade_detail.py` раньше фильтровал `quality_score < 50` (26 файлов) и расходился с `check:quality` (`grade === 'F'` → 38). Скрипт выровнен с baseline.

---

## 3. Security (ручная сверка с `.agents/rules/security.md`)

### Закрыто / соответствует правилам

- Webhook auth: [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/[id]/route.ts:64) использует `if (!providedToken || providedToken !== webhookSecret)`. Уязвимый паттерн `provided && provided !== secret` отсутствует.
- Rate limiting: 0 sensitive routes без `enforceRateLimit()`. Login 10/min, setup execute 3/10min, webhook 60/min.
- LDAP: [`escapeLdapFilter()`](../packages/auth/src/ldap.ts:45) применяется ко всем подстановкам в фильтр; есть unit-тесты.
- Raw SQL: `$queryRaw` только как tagged template в health-check и setup test-db (`SELECT 1`).
- Files API: auth + `normalizeStoredFilePath` + `canReadStoredFile` + `resolvedFullPath.startsWith(uploadRoot)`.
- Notifications: фильтр `where: { userId: user.userId }` — object-level ownership, RBAC не требуется.
- Setup reinstall: после `.installed` требуется роль `admin`.
- Production compose: `POSTGRES_PASSWORD:?` и `JWT_SECRET:?` без fallback.
- Setup UI: пустые password fields; `reset-admin` требует `ADMIN_PASSWORD` / argv, без `admin123`.
- `dangerouslySetInnerHTML` только в [`ThemeRegistry.tsx`](../apps/web/src/theme/ThemeRegistry.tsx) для Emotion CSS (не user HTML).

Публичные границы без session-auth (ожидаемо):

- [`apps/web/src/app/api/auth/login/route.ts`](../apps/web/src/app/api/auth/login/route.ts) — Zod + rate limit.
- [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/[id]/route.ts) — secret, если задан.

Heuristic `getCurrentUser` без `PERMISSIONS.*` (10 маршрутов): logout, me, files, notifications\*, setup\*. Ownership/install-guard подтверждены; это не auth-bypass.

### Остаточный риск (не P0, но не закрывать молча)

| ID | Severity | Finding | Evidence | Рекомендация |
|---|---|---|---|---|
| S1 | Medium | Dev [`docker-compose.yml`](../docker-compose.yml:11) содержит fallback `postgrespassword`, `adminpassword`, статический JWT. `NODE_ENV=production` на этом стеке. | compose lines 11, 36, 62–63, 78 | Оставить только для local-dev; не использовать файл как prod path. `docker-compose.prod.yml` уже строгий. |
| S2 | Low | [`.env.example`](../.env.example:81) всё ещё показывает `JIRA_API_TOKEN=adminpassword`. | line 81 | Заменить на `REPLACE_WITH_JIRA_TOKEN`, как остальные секреты. |
| S3 | Low | [`validateEnv()`](../apps/web/src/lib/env-validate.ts:105) для LDAP запрещает только `password`/`changeme`, не `adminpassword`. | lines 105–113 | Добавить `adminpassword` в `forbiddenValues` LDAP. |
| S4 | Medium | Если у интеграции **нет** `webhookSecret`, webhook принимается без токена. | [`webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/[id]/route.ts:53) `if (webhookSecret) { ... }` | Требовать секрет для активных интеграций либо явно документировать unsigned inbound как opt-in. |
| S5 | Low | Login route логирует LDAP-ошибки через `console.error`, не `logger`. | [`login/route.ts`](../apps/web/src/app/api/auth/login/route.ts:49) | Перевести на structured logger. |

Локальный `.env` содержит demo-пароли — файл в `.gitignore`, в Git не попадает.

---

## 4. UI design-code

- Hex вне theme-файлов: **0** (`pnpm check:theme`).
- Entity statuses в большинстве мест идут через [`StatusBadge`](../apps/web/src/components/ui/StatusBadge.tsx) (81+ usages). Эталон: [`ApprovalWizardDialog.tsx`](../apps/web/src/components/eps/ApprovalWizardDialog.tsx:214).
- `<Chip>` остаётся для metadata: коды складов, артикулы, счётчики, единицы, shortcuts, вложения. Это соответствует решению аудита 2026-08-27.
- Shared UI library на месте: `StatCard`, `SearchInput`, `FilterToolbar`, `EmptyState`, `DataTableWrapper`, `ConfirmDialog`.

### UI-1 — Chip вместо StatusBadge (entity status)

[`EquipmentPassportOverview.tsx`](../apps/web/src/components/eps/EquipmentPassportOverview.tsx:285) рендерит «Текущий статус» через `<Chip label={statusInfo.label} />`. Это статус оборудования — нарушение [`.agents/rules/ui_design_code.md`](../.agents/rules/ui_design_code.md) §1. Замена: `<StatusBadge status={equipment.status} />`. Bounded story, без рефакторинга всего паспорта.

---

## 5. F-grade web files (38) — приоритет декомпозиции

Parser-ограничения отмечены. Приоритет по размеру + доменной чувствительности, не по score=0.

### P1 — крупные wizards / страницы

| Файл | Lines | Главный smell |
|---|---:|---|
| [`apps/web/src/app/admin/settings/page.tsx`](../apps/web/src/app/admin/settings/page.tsx) | 1097 | god page, dump/test handlers |
| [`apps/web/src/components/wms/WarehouseTopologyModal.tsx`](../apps/web/src/components/wms/WarehouseTopologyModal.tsx) | 927 | complexity 12.7, cell CRUD |
| [`apps/web/src/app/wms/stock/page.tsx`](../apps/web/src/app/wms/stock/page.tsx) | 905 | load/sort/filter |
| [`apps/web/src/components/eps/EquipmentWizardForm.tsx`](../apps/web/src/components/eps/EquipmentWizardForm.tsx) | 843 | renderFieldInput 97, handleSave 62 |
| [`apps/web/src/app/eps/reports/page.tsx`](../apps/web/src/app/eps/reports/page.tsx) | 842 | ReportBuilderContent, export |
| [`apps/web/src/components/eps/SmartImportWizard.tsx`](../apps/web/src/components/eps/SmartImportWizard.tsx) | 820 | analyze/execute |
| [`apps/web/src/app/wms/inventory/page.tsx`](../apps/web/src/app/wms/inventory/page.tsx) | 768 | filters |
| [`apps/web/src/app/eps/[id]/page.tsx`](../apps/web/src/app/eps/[id]/page.tsx) | 755 | passport content |
| [`apps/web/src/app/wms/warehouses/page.tsx`](../apps/web/src/app/wms/warehouses/page.tsx) | 734 | submit complexity 18 |
| [`apps/web/src/app/srm/page.tsx`](../apps/web/src/app/srm/page.tsx) | 720 | SrmPageContent 112 |
| [`apps/web/src/app/setup/page.tsx`](../apps/web/src/app/setup/page.tsx) | 696 | execute/LDAP test |
| [`apps/web/src/components/layout/Sidebar.tsx`](../apps/web/src/components/layout/Sidebar.tsx) | 687 | loadData/logout |
| [`apps/web/src/app/wms/page.tsx`](../apps/web/src/app/wms/page.tsx) | 682 | DeficitItem / fetchStats |
| [`apps/web/src/components/mro/MroExecutionWizardDialog.tsx`](../apps/web/src/components/mro/MroExecutionWizardDialog.tsx) | 650 | submit |
| [`apps/web/src/app/login/page.tsx`](../apps/web/src/app/login/page.tsx) | 642 | performLogin |
| [`apps/web/src/app/wms/operations/page.tsx`](../apps/web/src/app/wms/operations/page.tsx) | 641 | quick dispatch |
| [`apps/web/src/app/admin/feedback/page.tsx`](../apps/web/src/app/admin/feedback/page.tsx) | 619 | filters |
| [`apps/web/src/components/wms/WmsOperationWizardDialog.tsx`](../apps/web/src/components/wms/WmsOperationWizardDialog.tsx) | 608 | wizard 174 |
| [`apps/web/src/components/wms/WmsOperationItemsStep.tsx`](../apps/web/src/components/wms/WmsOperationItemsStep.tsx) | 602 | single 65-line component |
| [`apps/web/src/components/eps/EquipmentTableView.tsx`](../apps/web/src/components/eps/EquipmentTableView.tsx) | 598 | large file, 0 parsed functions |
| [`apps/web/src/app/admin/audit-log/page.tsx`](../apps/web/src/app/admin/audit-log/page.tsx) | 563 | `sortAuditLogs` complexity 22 |

### P2 — меньше 500 строк, но F из-за complexity / parser

[`EquipmentOperationalTabs.tsx`](../apps/web/src/components/eps/EquipmentOperationalTabs.tsx), [`EquipmentPassportOverview.tsx`](../apps/web/src/components/eps/EquipmentPassportOverview.tsx), [`theme.ts`](../apps/web/src/theme/theme.ts) (false F: нет функций), [`StockDetailDrawer.tsx`](../apps/web/src/components/wms/StockDetailDrawer.tsx) (complexity 20), [`TransferRequestDialog.tsx`](../apps/web/src/components/wms/TransferRequestDialog.tsx).

Остальные 12 F-файлов с `grade === 'F'` при score 52–58 (module-settings, inventory `[id]`, WMS cells/operations/transfers API, MRO history, WmsStockTable, mro page, SrmReliabilityAnalytics, eps-import-helpers, ApprovalWizardDialog, SrmIssueDetailsDrawer) — дробить только вместе с тестами consumers.

Packages F-grade: **нет**. Худший package-файл — [`packages/database/src/seed-data/domain-data.ts`](../packages/database/src/seed-data/domain-data.ts) grade D (63), `seedDomainData` 66 строк + demo magic numbers.

---

## 6. Async / logging (universal + TypeScript rules)

`.catch(console.error)` без пользовательского feedback:

- UI: MRO execution wizard, Approval wizard, Transfer request/receive, StockDetailDrawer, Create/Edit nomenclature.
- API best-effort notifications: WMS transfers create/dispatch/reject/receive.

Пустые `catch (e) {}` в [`DataTableWrapper.tsx`](../apps/web/src/components/ui/DataTableWrapper.tsx:313) вокруг `localStorage` — допустимый private-mode guard, лучше логировать debug.

---

## 7. Рекомендуемые bounded stories (очередность)

Подробный план с шагами, DoD и расписанием: [`docs/REMEDIATION_PLAN.md`](REMEDIATION_PLAN.md).

1. **Docs/examples:** убрать `JIRA_API_TOKEN=adminpassword` из `.env.example`; расширить LDAP forbidden defaults в `env-validate`.
2. **Webhook policy:** не принимать inbound без секрета, либо явный `allowUnsignedWebhooks` в integration config + тест.
3. **Logging:** заменить `.catch(console.error)` и login `console.error` на `logger` + UI error state.
4. **UI-1:** `StatusBadge` вместо `Chip` в [`EquipmentPassportOverview.tsx`](../apps/web/src/components/eps/EquipmentPassportOverview.tsx:285).
5. **Admin settings / WMS topology / EPS wizard** — по одному PR, без смены API contract.
6. **Не трогать** массово 1911 `magic_number`: выделять только domain constants (лимиты, статусы, timeouts).

Каждая story: Conventional Commit, lint + tsc + targeted tests; security/API — полный `pnpm test` и `python scripts/route_audit.py`.

---

## 8. Definition of Done текущего baseline

- [x] `pnpm check:quality` PASS (in-memory, без root artifacts)
- [x] Theme token check PASS
- [x] Route audit: 0 rate-limit gaps
- [x] Webhook fail-closed при заданном секрете
- [x] Production compose требует секреты
- [x] Packages без F-grade
- [ ] Web F-grade < 38 (сейчас ровно на пороге)
- [ ] Unsigned webhook закрыт политикой
- [ ] `.env.example` без demo Jira token
- [ ] `EquipmentPassportOverview` использует `StatusBadge` для статуса оборудования

---

*Повторная инспекция 2026-08-29 @ `0f57ab3`. Правила агентов: AGENTS.md v2.0.*
