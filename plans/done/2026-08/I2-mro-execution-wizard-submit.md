---
id: I2
title: Extract MroExecutionWizardDialog submit module
status: done
phase: I
priority: P2
risk: low
skills: [senior-frontend]
opened: 2026-08-30
closed: 2026-08-30
commits: [b10ff28]
gates: [lint, tsc, check:quality]
---

# I2 — Extract MroExecutionWizardDialog submit module

## Problem

[`apps/web/src/components/mro/MroExecutionWizardDialog.tsx`](../../apps/web/src/components/mro/MroExecutionWizardDialog.tsx)
is 652 lines; `handleSubmit` is 67 lines / cx 13.

## Scope

Extract `handleSubmit` payload preparation into a sibling submit module,
following the pattern already used in
[`operation-submit.ts`](../../apps/web/src/components/wms/operation-submit.ts) (C15) and
[`equipment-wizard-submit.ts`](../../apps/web/src/components/eps/equipment-wizard-submit.ts) (C4.2).

Will NOT change: request body shape, API endpoint, dialog state ownership.

## Steps

1. Read the file completely.
2. Extract pure payload-building logic into `mro-execution-submit.ts`.
3. Keep `.catch` / logger / snackbar wiring in the dialog component (already
   migrated to structured logging in phase B1).
4. Verify against existing MRO tests before/after.

## Definition of Done

- [x] `handleSubmit` in the dialog component ≤ 50 lines, cx ≤ 10.
- [x] Request payload byte-identical to before for the same inputs.
- [x] Full gate green: lint, tsc, `pnpm test`, quality baseline.

## Result

Extracted checklist and used-parts payload preparation into
[`mro-execution-submit.ts`](../../apps/web/src/components/mro/mro-execution-submit.ts).
The dialog retains request, snackbar, success, and error orchestration while
`handleSubmit` delegates pure payload construction.

Verification: web lint, web TypeScript check, 160 tests, quality baseline, and
`git diff --check` passed.
