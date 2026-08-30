---
id: I1
title: Decompose EquipmentWizardForm into step components
status: done
phase: I
priority: P2
risk: low
skills: [senior-frontend]
opened: 2026-08-30
closed: 2026-08-30
commits: [e8ee97d]
gates: [lint, tsc, check:quality]
---

# I1 — Decompose EquipmentWizardForm into step components

## Problem

[`apps/web/src/components/eps/EquipmentWizardForm.tsx`](../../../apps/web/src/components/eps/EquipmentWizardForm.tsx)
is 757 lines. `handleSave` is cx 13. This is a presentation-heavy file
(low real risk) — see [`plans/PHASE-I-NOTES.md`](../../PHASE-I-NOTES.md) for
shared phase-I rules (stop-files, known false-positives) and
[`.agents/rules/code_quality.md`](../../../.agents/rules/code_quality.md) for
the general priority rule (cx over raw score).

## Scope

Extract wizard steps into separate step components under
`apps/web/src/components/eps/`, following the same recipe already proven in
C4.1–C4.3 and C5.2b.1–C5.2b.4 (see `plans/done/2026-08/`).

Will NOT change: form field names, validation rules, submit payload shape
(`equipment-wizard-submit.ts` already extracted in C4.2), API contract.

## Steps

1. Read the file completely; identify step boundaries already implied by the
   wizard UI (basic info, technical params, custom fields, review).
2. Extract one step per commit into `EquipmentWizardStep<N><Name>.tsx`.
3. Keep state, fetching, and `handleSave` orchestration in the parent form.
4. After each extraction: lint, tsc, `pnpm test`, quality baseline.

## Definition of Done

- [x] `EquipmentWizardForm.tsx` reduced below 500 lines OR each remaining
      block is a thin orchestrator with no repeated JSX blocks.
- [x] `handleSave` behavior and payload unchanged (verified by existing
      tests / manual submit smoke test).
- [x] Full gate green: lint, tsc, `pnpm test`, `node scripts/check-quality-baseline.mjs`.

## Result

Extracted the four wizard presentation steps into dedicated components. The
parent remains responsible for state, metadata loading, navigation, validation,
and submit orchestration. `EquipmentWizardForm.tsx` is now 166 lines.

Verification: web lint, web TypeScript check, 160 tests, and quality baseline
all passed. The test run also emitted the existing external database connection
log, but no tests failed.
