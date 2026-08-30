---
id: B1
title: Replace console.error with structured logging (bounded list)
status: done
phase: B
priority: P2
risk: low
skills: [senior-backend, senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: []
gates: [lint, tsc, test, route_audit, check:quality]
---

# B1 — Replace console.error with structured logging (bounded list)

## Problem

Confirmed best-effort API paths and UI loading paths used raw
`console.error`, bypassing structured logging and losing correlation
context. Full list of affected files was fixed at scope-start (see below);
this was explicitly **not** a repository-wide sweep.

## Scope

| Layer | File |
|---|---|
| API | [`api/auth/login/route.ts:49`](../../../apps/web/src/app/api/auth/login/route.ts) |
| API | [`api/notifications/route.ts:37`](../../../apps/web/src/app/api/notifications/route.ts) |
| API best-effort | [`api/wms/transfers/route.ts`](../../../apps/web/src/app/api/wms/transfers/route.ts) (dispatch/reject/receive) |
| UI | `MroExecutionWizardDialog.tsx`, `ApprovalWizardDialog.tsx`, `TransferRequestDialog.tsx`, `TransferReceiveDialog.tsx`, `StockDetailDrawer.tsx`, `CreateNomenclatureDialog.tsx`, `EditNomenclatureDialog.tsx` |

Followed by two additional bounded batches in the same phase: MRO API
(checklists/plans/schedules, 7 raw logs) and WMS core collection routes
(categories, nomenclature, warehouses, operations, 7 raw logs).

## Result

- Server errors go through `logger.error(...)` with correlation/entity
  context; passwords are never logged.
- Best-effort notification failures use `logger.warn` and keep best-effort
  semantics (main response is not affected).
- Bounded UI dictionary/history failures show a snackbar/error state instead
  of a silent console log.
- `DataTableWrapper`'s `localStorage` guard kept with a comment explaining
  private-mode/quota as the expected failure mode.
- No new logging framework introduced.
- Remaining legacy `console.error` outside this bounded list is intentional
  residual debt — not part of this story's scope (would require a separate
  bounded batch).
- Verified: 156 tests passed; lint/tsc/route audit/quality baseline PASS.
- Commits: `refactor: replace console.error catch paths with logger and UI errors`
  plus separate Conventional Commits for the MRO and WMS batches.
