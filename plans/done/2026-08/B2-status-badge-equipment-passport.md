---
id: B2
title: Use StatusBadge for equipment status in passport overview
status: done
phase: B
priority: P2
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: []
gates: [lint, tsc, check:theme, test, check:quality]
---

# B2 — Use StatusBadge for equipment status in passport overview

## Problem

[`EquipmentPassportOverview.tsx:285`](../../../apps/web/src/components/eps/EquipmentPassportOverview.tsx)
rendered "Текущий статус" via `<Chip label={statusInfo.label} />`, which is
an entity status — forbidden by
[`.agents/rules/ui_design_code.md`](../../../.agents/rules/ui_design_code.md).

## Scope

Replace the Chip with `<StatusBadge status={equipment.status} />`, matching
the pattern already used in `ApprovalWizardDialog.tsx:214`. Metadata Chips
(equipment tags) were explicitly kept.

## Result

- Equipment status in the passport now renders exclusively via `StatusBadge`.
- Metadata Chips preserved.
- Verified: lint + tsc, theme check, 156 tests, quality baseline PASS.
- Commit: `fix(ui): use StatusBadge for equipment status in passport overview`
