---
id: C12
title: Extract equipment SRM incidents tab
status: done
phase: C
priority: LOW
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: [44f1dd6, d099c31]
gates: [lint, tsc, check:quality]
---

# C12 — Extract equipment SRM incidents tab

## Result

SRM incident branch of
[`EquipmentOperationalTabs.tsx`](../../../apps/web/src/components/eps/EquipmentOperationalTabs.tsx)
extracted to
[`EquipmentSrmIncidentsTab.tsx`](../../../apps/web/src/components/eps/EquipmentSrmIncidentsTab.tsx);
MRO/SRM routing, callbacks, `StatusBadge`, `DataTableWrapper`, `EmptyState`
behavior preserved. Verified: lint, tsc, targeted quality checker (78/100,
C), quality baseline (web 80.3, F=34, SOLID=24), `git diff --check` — PASS.
Commits: `44f1dd6` (implementation), `d099c31` (documentation).
