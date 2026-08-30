---
id: C3
title: Decompose WMS stock page (filters, zone cell)
status: done
phase: C
priority: MEDIUM
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: []
gates: [lint, tsc, test, route_audit, check:theme, check:quality]
---

# C3 — Decompose WMS stock page (filters, zone cell)

## Problem

[`apps/web/src/app/wms/stock/page.tsx`](../../../apps/web/src/app/wms/stock/page.tsx)
was 905 lines, bundling filter model, sort handler, zone loader, and table
section in one file.

## Sub-stories

- **C3.1** — Filter toolbar/model extracted to
  [`WmsStockFilters.tsx`](../../../apps/web/src/components/wms/WmsStockFilters.tsx);
  warehouse/zone/category filters, `SearchInput`, low-stock switch, and
  ExportButton wrapped as typed shared-UI. Option types exported from the
  page for type-safe props. State, pagination, export, and dictionary
  loading stayed in the route owner. Verified: lint, tsc, 160 tests, route
  audit, theme check, quality baseline (web 78.7, F=37, SOLID=25).
- **C3.2** — `ZoneCell` extracted to
  [`WmsStockZoneCell.tsx`](../../../apps/web/src/components/wms/WmsStockZoneCell.tsx);
  table props, click behavior, permission gating preserved.
- **C3.3** — Full verification: lint/tsc, 160 tests, route audit, theme
  check, quality baseline (web 78.8, F=36, SOLID=25) — PASS.
- **C3.4** — Closed via `refactor(wms): extract stock filters toolbar` and a
  separate `WmsStockZoneCell` change.

## Result

Filters and zone cell extracted from the stock page with zero API or
behavior change.
