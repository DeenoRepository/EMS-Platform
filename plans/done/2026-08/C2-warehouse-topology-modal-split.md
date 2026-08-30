---
id: C2
title: Decompose WarehouseTopologyModal (zone nav, active zone panel)
status: done
phase: C
priority: MEDIUM
risk: medium
skills: [senior-frontend, senior-backend]
opened: 2026-08-29
closed: 2026-08-29
commits: [46b1e10, f463c9d]
gates: [lint, tsc, test, route_audit, check:theme, check:quality]
---

# C2 — Decompose WarehouseTopologyModal (zone nav, active zone panel)

## Problem

[`apps/web/src/components/wms/WarehouseTopologyModal.tsx`](../../../apps/web/src/components/wms/WarehouseTopologyModal.tsx)
was 927 lines (cx 12.7), bundling zone list, cell grid, batch generation,
and delete confirmation. Rollback behavior on
`handleDeleteCell` / `handleBatchGenerate` errors needed to be preserved
exactly — no zone/cell API changes allowed.

## Sub-stories

- **C2.1** — Zone navigation panel extracted to
  [`WarehouseZonesNavigation.tsx`](../../../apps/web/src/components/wms/WarehouseZonesNavigation.tsx);
  selection/search state and CRUD handlers stayed in the parent. Removed a
  genuinely unused `SearchIcon` import. Verified: lint, tsc, 160 tests,
  route audit, theme check, quality baseline (web 78.6, F=37, SOLID=25).
- **C2.2** — Active-zone content and cell grid extracted to
  [`WarehouseActiveZonePanel.tsx`](../../../apps/web/src/components/wms/WarehouseActiveZonePanel.tsx);
  `filteredCells`, search, create/batch/delete callbacks, and empty state
  preserved. Verified: 160 tests, lint, tsc, route audit, theme check,
  quality baseline (web 78.7, F=37, SOLID=25).
- **C2.3** — Final verification: parent 615 lines, navigation 114 lines,
  active-zone panel 272 lines. lint/tsc, 160 tests, route audit, theme
  check, quality baseline (web 78.7, F=37, SOLID=25) — PASS. API contracts,
  CRUD callbacks, state ownership unchanged.

## Result

Commits: `46b1e10` — `refactor(wms): extract warehouse zones navigation`;
`f463c9d` — `refactor(wms): extract active zone and cell grid panel`.
