---
id: K5
title: Заменить остаточные console-вызовы в UI и сервисах
status: active
phase: K
priority: P3
risk: low
skills: [senior-frontend, code-reviewer]
opened: 2026-08-30
closed: null
commits: [90a2134, 44550a8, b0f4c5f, d1c8672, 50dade2]
gates: [test, lint, tsc, check:quality]
classification_commit: pending
current_batch: K5.5 WMS stock page and operation wizard UI error sinks
batch_status: implementation complete; all gates passed
---

# K5 — Заменить остаточные console-вызовы в UI и сервисах

## Problem

В production UI/hooks/lib остаются прямые `console.error/warn`, например в
[`useWarehouseAccess.ts`](../../apps/web/src/hooks/useWarehouseAccess.ts:54),
[`field-mapping.ts`](../../apps/web/src/lib/jira/field-mapping.ts:179) и
[`WmsOperationWizardDialog.tsx`](../../apps/web/src/components/wms/WmsOperationWizardDialog.tsx:191).
API-пути уже очищены. Часть оставшихся вызовов является допустимым sink
структурированного logger или React error boundary и не должна удаляться
механически.

## Scope

- Сначала классифицировать все найденные console-вызовы: intentional sink,
  user-visible recoverable error, server/service diagnostic.
- Мигрировать только необоснованные вызовы bounded-наборами на shared logger,
  snackbar/error state или безопасное игнорирование с комментарием.
- Сохранить обоснованные console sinks в [`logger.ts`](../../apps/web/src/lib/logger.ts)
  и error boundary, если они являются последней линией диагностики.
- Не вводить новый logging framework и не смешивать cleanup с UI refactoring.

## Classification

Проверено по `apps/web/src` (24 вызова):

| Location | Classification | Disposition |
|---|---|---|
| `lib/logger.ts:57,60,63` | intentional logger implementation sink | retain |
| `components/ui/ErrorBoundary.tsx:39` | intentional React error boundary sink | retain |
| `app/error.tsx:15` | intentional App Router boundary sink | retain |
| `app/wms/inventory/page.tsx:105` | user-visible recoverable error; snackbar already present | remove direct console |
| `app/wms/inventory/page.tsx:134` | recoverable dictionary-load failure; no visible state | bounded follow-up batch |
| `app/wms/inventory/[id]/page.tsx:107` | user-visible recoverable error; snackbar already present | remove direct console |
| `components/eps/EquipmentWizardForm.tsx:98` | user-visible recoverable error; snackbar already present | bounded follow-up batch |
| `components/wms/WarehouseTopologyModal.tsx:116` | user-visible recoverable error; snackbar already present | bounded follow-up batch |
| `components/srm/CreateServiceRequestDialog.tsx:96` | recoverable load failure; no visible error state | bounded follow-up batch |
| `app/wms/stock/page.tsx:208,229,313` | recoverable load failures; mixed/no visible state | bounded follow-up batch |
| `app/wms/page.tsx:121` | recoverable load failure; no visible state | bounded follow-up batch |
| `app/setup/page.tsx:209` | recoverable setup-status failure; existing status state needs verification | bounded follow-up batch |
| `hooks/useWarehouseAccess.ts:54` | recoverable hook fetch failure; no error state | bounded follow-up batch |
| `components/wms/WmsOperationWizardDialog.tsx:191` | recoverable stock-load failure; no visible state | bounded follow-up batch |
| `lib/custom-sections-defaults.ts:282` | server migration diagnostic | replace with structured logger |
| `lib/storage.ts:106` | server file-operation diagnostic | replace with structured logger |
| `lib/system-settings-service.ts:68` | server fallback diagnostic | replace with structured logger |
| `lib/jira/field-mapping.ts:179` | server fallback diagnostic | replace with structured logger |
| `lib/jira/field-mapping.ts:325` | server regex configuration diagnostic | replace with structured logger |
| `lib/jira/notifications.ts:60` | server notification diagnostic | replace with structured logger |

## Batches

1. **K5.1 — WMS inventory UI sinks (current):** remove the two direct console calls that duplicate existing user-visible snackbar errors in the inventory list and inventory detail pages. No behavior change beyond eliminating duplicate developer-console output. Implementation and verification complete.
2. **K5.2 — WMS inventory dictionary and topology UI error sinks (current):** replace the inventory warehouse dictionary console call with the existing snackbar error path and remove the duplicate topology console call while preserving its existing snackbar behavior. Targeted and full gates passed.
3. **K5.3 — server/service diagnostics migrated to the existing structured logger, with safe error context only.** Five named server/service modules updated; intentional sinks excluded.
4. **K5.4 — EPS wizard and SRM dialog UI error sinks:** preserve existing EPS wizard snackbar handling while removing its duplicate console diagnostic; surface equipment-list load failures in the SRM dialog through the existing snackbar mechanism. Intentional sinks and unrelated UI calls excluded.
5. **K5.5 — Warehouse access hook and WMS dashboard UI error sinks:** replace direct console diagnostics with user-visible snackbar errors for warehouse-access and dashboard data-loading failures, including non-success API responses. Preserve loading, filtering, auto-selection, maintenance handling, and refresh behavior. Completed.
6. **K5.5 follow-up — WMS stock page and operation wizard UI error sinks:** replace recoverable dictionary, zone, storage-cell, and stock-balance console diagnostics with existing snackbar paths, including unsuccessful API payloads. Preserve loading/state cleanup and API contracts. Completed.
7. **K5.5 follow-up 2 — setup status and shared table persistence UI error sinks:** surface setup-status failures in the existing setup page error state and intentionally suppress non-fatal localStorage persistence diagnostics while preserving in-session table settings and fallback defaults. Completed.

## Steps

1. Сформировать фиксированный список production-вызовов и исключений.
2. Разделить работу на небольшие batches по модулю/типу ошибки.
3. Для UI ошибок обеспечить пользовательское состояние, если его нет.
4. Для diagnostics использовать structured logger с контекстом без secrets.
5. Проверить отсутствие новых console-вызовов в изменённых областях.

## Definition of Done

- [ ] Каждый оставшийся console-вызов имеет документированное техническое
  обоснование либо находится внутри logger/error-boundary sink.
- [ ] Необоснованные UI/lib console-вызовы заменены bounded-изменениями.
- [ ] Ошибки не замалчиваются и secrets/PII не добавлены в лог-контекст.
- [ ] Full gate green: tests, lint, web tsc и quality baseline.

## K5.2 Result

- Scope: `app/wms/inventory/page.tsx:134` and `components/wms/WarehouseTopologyModal.tsx:116`.
- Classification verified: both are recoverable UI failures; the inventory dictionary loader had no visible error state, while the topology loader already displayed a snackbar.
- Behavior preserved: inventory dictionary failure now displays `Ошибка загрузки складов`; topology failure retains `Не удалось загрузить топологию склада` and loading cleanup.
- Excluded: intentional logger/ErrorBoundary sinks and server diagnostics were not modified.
- Verification: targeted API/security test, full test suite (165/165), web lint, workspace lint, web TypeScript, and quality baseline all passed.

## K5.3 Result

- Scope: `lib/custom-sections-defaults.ts:282`, `lib/storage.ts:106`, `lib/system-settings-service.ts:68`, `lib/jira/field-mapping.ts:179,325`, and `lib/jira/notifications.ts:60`.
- Classification verified: all six calls were server/service diagnostics; intentional sinks in `logger.ts`, `components/ui/ErrorBoundary.tsx`, and `app/error.tsx` were excluded.
- Result: replaced direct console calls with the existing `logger.error`/`logger.warn` API. Context is limited to error type and excludes error messages, paths, issue content, equipment names, settings, credentials, and other PII/secrets.
- Behavior preserved: migration, file deletion, settings fallback, field-mapping fallback/regex handling, and notification failure swallowing remain unchanged.
- Verification: targeted API/security test (18/18), full test suite (165/165), workspace lint, web TypeScript, and quality baseline all passed. `git diff --check` passed; the follow-up Windows `findstr` scan command returned exit 1 after tests passed because no matches were found in the changed files.

## K5.5 Result

- Scope: `hooks/useWarehouseAccess.ts:54` and `app/wms/page.tsx:121`.
- Classification verified through consumers: warehouse-access failures are consumed by WMS operations and transfer panels without an existing error state; the dashboard had loading/empty states but no recoverable load-error state. The shared `notistack` provider is available to both consumers.
- Result: replaced both direct console diagnostics with user-visible snackbar handling for failed requests, unsuccessful API payloads, and network failures. The dashboard loader now uses `useCallback` so its refresh callback remains stable and satisfies hook dependencies.
- Behavior preserved: warehouse filtering, automatic single-warehouse selection, loading cleanup, dashboard maintenance preview, refresh action, and wizard success refresh remain unchanged. No errors are hidden and no secrets, error details, or PII are logged.
- Excluded: remaining documented UI files, intentional logger/ErrorBoundary/app error sinks, and unrelated UI refactoring.
- Verification: web lint, web TypeScript, full test suite (165/165), quality baseline, and `git diff --check` all passed. The test output includes the existing structured database-error diagnostic from the test suite; all tests passed.

## K5.4 Result

- Scope: `components/eps/EquipmentWizardForm.tsx:97` and `components/srm/CreateServiceRequestDialog.tsx:85`.
- Classification verified through consumers: the EPS wizard already had a user-visible snackbar for metadata loading failures; the SRM dialog had no visible error state for equipment-list loading.
- Result: removed the duplicate EPS console diagnostic and added snackbar handling for unsuccessful or failed equipment-list loading, including the API error when available. The effect dependency list was updated for the existing snackbar callback.
- Behavior preserved: metadata and equipment loading state cleanup remains in `finally`; submission flows and consumer callbacks were not changed. No secrets, error details, or PII are logged.
- Excluded: intentional logger/ErrorBoundary/app error sinks and unrelated UI calls.
- Verification: full test suite (165/165), web lint, web TypeScript, quality baseline, `git diff --check`, and changed-file console scan all passed.

## K5.5 Follow-up Result

- Scope: `app/wms/stock/page.tsx:208,229,313` and `components/wms/WmsOperationWizardDialog.tsx:191`.
- Classification verified through existing consumers and local error handling: all four calls were recoverable UI load failures; the stock page already used snackbars for stock and location-save failures, while the wizard already used snackbars for metadata and submission failures.
- Result: replaced direct console diagnostics with user-visible snackbar errors for dictionary, warehouse-zone, storage-cell, and wizard stock-balance failures. Non-success API responses are surfaced without exposing response details. The wizard stock loader retains its `finally` loading cleanup and now declares the snackbar callback dependency; stock-page effects declare the callback dependency as well.
- Behavior preserved: successful data mapping, filtering, modal opening, stock cache handling, loading cleanup, and API request/response contracts remain unchanged.
- Excluded: intentional logger/ErrorBoundary/app error sinks and unrelated files.
- Verification: targeted changed-file console scan, full test suite (165/165), web lint, workspace lint, web TypeScript, quality baseline, and `git diff --check` all passed. The test output includes the existing structured database-error diagnostic from the test suite; all tests passed.

## K5.5 Follow-up 2 Result

- Scope: `app/setup/page.tsx:209` and `components/ui/DataTableWrapper.tsx:267,276`.
- Classification verified: setup-status loading is a recoverable failure with existing loading/locked-state behavior; table localStorage failures are intentionally non-fatal because defaults and current in-session settings remain usable.
- Result: setup status now surfaces unsuccessful responses and network failures through an inline error alert; DataTable localStorage load/save catches no longer emit noisy console diagnostics and retain fallback behavior.
- Behavior preserved: setup loading completion, dependency refresh cleanup, installed-state handling, table settings restoration, current-session column selection, density selection, and localStorage guards remain unchanged.
- Excluded: intentional logger/ErrorBoundary/app error sinks and other pending non-intentional UI calls.
- Verification: pending in this batch.

## Result

K5.5 follow-up 2 implemented; K5 remains active because other non-intentional UI console calls are still documented and pending.
