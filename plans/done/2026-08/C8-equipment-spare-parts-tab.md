---
id: C8
title: Extract equipment spare-parts tab
status: done
phase: C
priority: LOW
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: [15c8dc6, 2c7f7c7]
gates: [lint, tsc, check:quality]
---

# C8 — Extract equipment spare-parts tab

## Result

Spare-parts branch of
[`EquipmentOperationalTabs.tsx`](../../../apps/web/src/components/eps/EquipmentOperationalTabs.tsx)
extracted to
[`EquipmentSparePartsTab.tsx`](../../../apps/web/src/components/eps/EquipmentSparePartsTab.tsx);
existing data, `StatusBadge`, `DataTableWrapper`, `EmptyState` contracts
preserved. Verified: lint, tsc, targeted quality checker, quality baseline,
`git diff --check` — PASS. Commits: `15c8dc6` (implementation), `2c7f7c7`
(documentation).
