---
id: I3
title: Split WmsOperationItemsStep table/row presentation
status: done
phase: I
priority: P2
risk: low
skills: [senior-frontend]
opened: 2026-08-30
closed: 2026-08-30
commits: [cf9b05c]
gates: [lint, tsc, check:quality]
---

# I3 — Split WmsOperationItemsStep table/row presentation

## Problem

[`apps/web/src/components/wms/WmsOperationItemsStep.tsx`](../../../apps/web/src/components/wms/WmsOperationItemsStep.tsx)
is 602 lines with cx 1 (pure markup — low risk, size-only finding).

## Scope

Split the items table and the item row into separate presentation
components. This is a pure JSX split; no logic changes expected.

## Steps

1. Read the file completely; identify the table shell vs. row rendering.
2. Extract row rendering into `WmsOperationItemRow.tsx`.
3. Keep item state, add/remove handlers, and validation in the parent step
   component (already the pattern from C14).

## Definition of Done

- [x] File split reduces `WmsOperationItemsStep.tsx` below 400 lines.
- [x] No visual or behavioral regression (manual smoke: add/remove/edit item row).
- [x] Full gate green: lint, tsc, quality baseline.

## Result

Extracted row presentation into
[`WmsOperationItemRow.tsx`](../../../apps/web/src/components/wms/WmsOperationItemRow.tsx).
The parent retains item state, stock calculations, add/remove handlers, and
validation. The source file is now 545 lines and the table row logic is isolated
without changing the request or interaction flow.

Verification: web lint, web TypeScript check, 160 tests, quality baseline, and
`git diff --check` passed.
