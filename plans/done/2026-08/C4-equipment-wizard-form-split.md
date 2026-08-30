---
id: C4
title: Decompose EquipmentWizardForm (custom field renderer, submit)
status: done
phase: C
priority: MEDIUM
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: []
gates: [lint, tsc, test, check:theme, check:quality]
---

# C4 — Decompose EquipmentWizardForm (custom field renderer, submit)

## Problem

[`apps/web/src/components/eps/EquipmentWizardForm.tsx`](../../../apps/web/src/components/eps/EquipmentWizardForm.tsx)
was 843 lines. `renderFieldInput` needed to become a field renderer map;
`handleSave` validation needed to become a pure function without
duplicating `CustomFieldValueRenderer`.

## Sub-stories

- **C4.1** — BOOLEAN/SELECT/TEXTAREA/default branches extracted to
  [`EquipmentCustomFieldRenderer.tsx`](../../../apps/web/src/components/eps/EquipmentCustomFieldRenderer.tsx);
  `customFieldValues` state and `handleCustomFieldChange` stayed in the
  parent. Verified: lint, tsc, 160 tests, theme check, quality baseline
  (web 78.9, F=36, SOLID=25).
- **C4.2** — Validation and payload preparation extracted to
  [`equipment-wizard-submit.ts`](../../../apps/web/src/components/eps/equipment-wizard-submit.ts);
  payload fields, `asDraft`, `submitForApproval` preserved. Verified: lint,
  tsc, 160 tests, theme check, quality baseline (web 79.0, F=36, SOLID=25).
- **C4.3** — Final check: form at 756 lines, imports clean, full gate
  (lint/tsc, 160 tests, theme check, quality baseline web 79.0, F=36,
  SOLID=25) — PASS.

## Result

Commit: `refactor(eps): extract equipment custom field renderer`.
