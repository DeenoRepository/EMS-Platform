---
id: C9
title: Extract equipment passport KPI panel
status: done
phase: C
priority: LOW
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: [667a03c, d7dc693]
gates: [lint, tsc, check:quality]
---

# C9 — Extract equipment passport KPI panel

## Result

Four-card KPI panel from
[`EquipmentPassportOverview.tsx`](../../../apps/web/src/components/eps/EquipmentPassportOverview.tsx)
extracted to
[`EquipmentPassportKpiPanel.tsx`](../../../apps/web/src/components/eps/EquipmentPassportKpiPanel.tsx);
typed equipment contract and shared `StatCard` usage preserved. Verified:
lint, tsc, targeted quality checker, quality baseline, `git diff --check` —
PASS. Commits: `667a03c` (implementation), `d7dc693` (documentation).
