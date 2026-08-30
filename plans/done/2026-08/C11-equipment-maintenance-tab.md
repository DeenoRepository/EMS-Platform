---
id: C11
title: Extract equipment maintenance tab
status: done
phase: C
priority: LOW
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: [d7a10ad, abef082]
gates: [lint, tsc, check:quality]
---

# C11 — Extract equipment maintenance tab

## Result

Maintenance branch of
[`EquipmentOperationalTabs.tsx`](../../../apps/web/src/components/eps/EquipmentOperationalTabs.tsx)
extracted to
[`EquipmentMaintenanceTab.tsx`](../../../apps/web/src/components/eps/EquipmentMaintenanceTab.tsx);
maintenance data, formatting, empty state, shared UI contracts preserved.
Verified: lint, tsc, targeted quality checker, quality baseline,
`git diff --check` — PASS. Commits: `d7a10ad` (implementation), `abef082`
(documentation).
