---
id: I4
title: Extract handleAddItem from WmsOperationWizardDialog
status: done
phase: I
priority: P2
risk: low
skills: [senior-frontend]
opened: 2026-08-30
closed: 2026-08-30
commits: [834bb2f]
gates: [lint, tsc, check:quality]
---

# I4 — Extract handleAddItem from WmsOperationWizardDialog

## Problem

[`apps/web/src/components/wms/WmsOperationWizardDialog.tsx`](../../apps/web/src/components/wms/WmsOperationWizardDialog.tsx)
is 575 lines; render block is 174 lines; `handleAddItem` is 68 lines (cx 11.4
average for the file).

## Scope

Extract `handleAddItem` line-merging/validation logic into a pure function
in [`operation-submit.ts`](../../apps/web/src/components/wms/operation-submit.ts)
(already exists from C15) or an adjacent module if scope differs from submit
payload building.

## Steps

1. Read the file completely.
2. Extract `handleAddItem` pure logic (duplicate detection, quantity merge)
   into a testable function.
3. Keep dialog state (`items`, step navigation) in the component.

## Definition of Done

- [x] `handleAddItem` in the component ≤ 30 lines, delegates to pure helper.
- [x] Add/merge/duplicate item behavior unchanged.
- [x] Full gate green: lint, tsc, `pnpm test`, quality baseline.

## Result

Extracted item validation, stock checks, write-off metadata, and line-item
construction into [`operation-item.ts`](../../apps/web/src/components/wms/operation-item.ts).
The dialog retains state updates and snackbar wiring while `handleAddItem`
delegates pure business logic.

Verification: web lint, web TypeScript check, 160 tests, quality baseline, and
`git diff --check` passed.
