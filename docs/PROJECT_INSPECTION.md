# EMS-Platform — инспекция проекта

**Дата инспекции:** 2026-08-29 (обновляется bounded remediation stories)
**Ветка:** `main` (см. последние Conventional Commits в Git history)
**Инструменты:** `code-reviewer` (`code_quality_checker.py`, `pr_analyzer.py`), [`scripts/inspect_summary.py`](../scripts/inspect_summary.py), [`scripts/fgrade_detail.py`](../scripts/fgrade_detail.py), [`scripts/route_audit.py`](../scripts/route_audit.py), [`scripts/check-theme-tokens.mjs`](../scripts/check-theme-tokens.mjs), [`scripts/check-quality-baseline.mjs`](../scripts/check-quality-baseline.mjs)
**Правила:** [`AGENTS.md`](../AGENTS.md), [`.agents/rules/security.md`](../.agents/rules/security.md), [`.agents/rules/code_quality.md`](../.agents/rules/code_quality.md), [`.agents/rules/ui_design_code.md`](../.agents/rules/ui_design_code.md), `.agents/skills/code-reviewer/rules/universal.md`, `.agents/skills/code-reviewer/languages/typescript.md`.

> **Вердикт:** Approve with suggestions. Quality baseline проходит. Критические security/UI findings из аудита 2026-08-27 закрыты bounded stories A1–A3, B1–B2. Остаточный долг — F-grade presentation-файлы (ровно на пороге 38) и legacy raw `console.error` вне B1.

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
- Compose policy: [`docker-compose.yml`](../docker-compose.yml) — explicit local development only (`NODE_ENV=development`, required secrets); production/offline compose требуют `POSTGRES_PASSWORD` и `JWT_SECRET` без fallback.
- Setup UI: пустые password fields; `reset-admin` требует `ADMIN_PASSWORD` / argv, без `admin123`.
- `dangerouslySetInnerHTML` только в [`ThemeRegistry.tsx`](../apps/web/src/theme/ThemeRegistry.tsx) для Emotion CSS (не user HTML).

Публичные границы без session-auth (ожидаемо):

- [`apps/web/src/app/api/auth/login/route.ts`](../apps/web/src/app/api/auth/login/route.ts) — Zod + rate limit.
- [`apps/web/src/app/api/srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/[id]/route.ts) — secret, если задан.

Heuristic `getCurrentUser` без `PERMISSIONS.*` (10 маршрутов): logout, me, files, notifications\*, setup\*. Ownership/install-guard подтверждены; это не auth-bypass.

### Остаточный риск (не P0, но не закрывать молча)

Legacy raw `console.error` в routes/components вне B1 остаётся отдельным observability debt. Он должен устраняться короткими bounded batches, не массовой заменой.

Закрыто в Story A1: S2 (`JIRA_API_TOKEN` заменён на placeholder) и S3 (LDAP-пароли проверяются по общему `DANGEROUS_DEFAULTS`); добавлены regression-тесты.
Закрыто в Story A2: S4 — активные интеграции без секрета отклоняются с 401/400, unsigned режим доступен только при явном `allowUnsignedWebhooks === true`; секреты маскируются в API-ответах.
Закрыто в Story A3: S1 — [`docker-compose.yml`](../docker-compose.yml) явно local-only, требует secrets из `.env` и запускает web container в development mode.

Локальный `.env` содержит demo-пароли — файл в `.gitignore`, в Git не попадает.

---

## 4. UI design-code

- Hex вне theme-файлов: **0** (`pnpm check:theme`).
- Entity statuses идут через [`StatusBadge`](../apps/web/src/components/ui/StatusBadge.tsx) (81+ usages), включая паспорт оборудования: [`EquipmentPassportOverview.tsx`](../apps/web/src/components/eps/EquipmentPassportOverview.tsx:285).
- `<Chip>` остаётся для metadata: коды складов, артикулы, счётчики, единицы, shortcuts, вложения и теги оборудования. Это соответствует решению аудита 2026-08-27.
- Shared UI library на месте: `StatCard`, `SearchInput`, `FilterToolbar`, `EmptyState`, `DataTableWrapper`, `ConfirmDialog`.

Закрыто в Story B2/UI-1: статус оборудования в паспорте заменён с `Chip` на shared `StatusBadge`; bounded изменение не затрагивает metadata Chips.

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

B1 закрыла подтверждённый bounded список:

- Login LDAP failure → [`logger.warn()`](../apps/web/src/lib/logger.ts:71).
- Notifications API failure → [`logger.error()`](../apps/web/src/lib/logger.ts:72).
- WMS transfer notification failures → [`logger.warn()`](../apps/web/src/lib/logger.ts:71), best-effort semantics сохранена.
- UI dictionary/history failures: snackbar/error feedback в MRO, approvals, transfers, nomenclature и stock detail.

MRO API batch (checklists, plans, schedules) и WMS core collection batch (categories, nomenclature, warehouses, operations) переведены на `logger.error` с endpoint context; общий regression guard предотвращает возврат raw `console.error` в этих routes.

Оставшиеся raw `console.error` в legacy routes/components и допустимые localStorage guards не являются частью B1; их следует устранять отдельными bounded batches. Полный тестовый набор после WMS batch: **157 passed**.

---

## 7. Рекомендуемые bounded stories (очередность)

Подробный план с шагами, DoD и расписанием: [`docs/REMEDIATION_PLAN.md`](REMEDIATION_PLAN.md).

1. **Legacy logging:** следующий bounded batch raw `console.error` в WMS detail/zones или feedback API routes.
2. **Admin settings / WMS topology / EPS wizard** — по одному PR, без смены API contract.
3. **Не трогать** массово 1911 `magic_number`: выделять только domain constants (лимиты, статусы, timeouts).

Каждая story: Conventional Commit, lint + tsc + targeted tests; security/API — полный `pnpm test` и `python scripts/route_audit.py`.

---

## 8. Definition of Done текущего baseline

- [x] `pnpm check:quality` PASS (in-memory, без root artifacts)
- [x] Theme token check PASS
- [x] Route audit: 0 rate-limit gaps
- [x] Webhook fail-closed при заданном секрете
- [x] Dev/prod/offline compose profiles require secrets and are correctly separated
- [x] Packages без F-grade
- [x] `.env.example` без demo Jira token; LDAP `adminpassword` блокируется валидатором
- [x] Unsigned webhook закрыт политикой: секрет обязателен для active, либо явный opt-in
- [x] B1 bounded logging/UI error paths завершены; полный тестовый набор 156 passed
- [x] `EquipmentPassportOverview` использует `StatusBadge` для статуса оборудования
- [ ] Web F-grade < 38 (сейчас ровно на пороге)

---

*Повторная инспекция 2026-08-29 @ `0f57ab3`. Правила агентов: AGENTS.md v2.0.*
