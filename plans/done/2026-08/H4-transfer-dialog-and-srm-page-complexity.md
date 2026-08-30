---
id: H4
title: Extract TransferRequestDialog validation and SRM issue view model
status: done
phase: H
priority: P1
risk: low
skills: [senior-frontend, code-reviewer]
opened: 2026-08-30
closed: 2026-08-30
commits: [6ac49f8]
gates: [lint, tsc, test, check:quality]
---

# H4 — Extract TransferRequestDialog validation and SRM issue view model

## Problem

[`TransferRequestDialog.tsx`](../../../apps/web/src/components/wms/TransferRequestDialog.tsx)
was cx 20 (payload building already extracted in C13 — remaining branching
was form validation/UI). [`srm/page.tsx`](../../../apps/web/src/app/srm/page.tsx)
`SrmPageContent` was cx 18.

## Scope

- H4.1: `resolveInitialWarehouseSelection` / `addOrMergeLineItem` extracted
  into
  [`transfer-request-submit.ts`](../../../apps/web/src/components/wms/transfer-request-submit.ts)
  (already existing module from C13).
- H4.2: details-drawer data preparation extracted into a new
  [`srm-issues-service.ts`](../../../apps/web/src/lib/srm-issues-service.ts)
  for fetch/sync, reusing the pattern already proven in
  `srm-issue-sorting.ts`.

## Result

- Both components' cx ≤ 12.
- Full gate — PASS.
- Commit: `6ac49f8`.
