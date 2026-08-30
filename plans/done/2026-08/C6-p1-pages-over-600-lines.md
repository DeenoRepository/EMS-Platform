---
id: C6
title: Decompose remaining P1 pages > 600 lines (bounded sub-stories)
status: done
phase: C
priority: MEDIUM
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-30
commits: [9203fa6, 5613e7a, f3950df, 370bf87]
gates: [lint, tsc, test, route_audit, check:theme, check:quality]
---

# C6 — Decompose remaining P1 pages > 600 lines (bounded sub-stories)

## Problem

Several pages > 600 lines remained after C1–C5 with identifiable single
extractable blocks each.

## Sub-stories

- **C6.2a** — WMS inventory filter toolbar extracted to
  [`WmsInventoryFilters.tsx`](../../../apps/web/src/components/wms/WmsInventoryFilters.tsx);
  filter/reset/pagination behavior preserved. Verified: quality baseline
  (web 79.3, F=36, SOLID=25).
- **C6.3** — Lifecycle-event mapping in the EPS equipment passport page
  extracted to
  [`equipment-lifecycle-events.ts`](../../../apps/web/src/components/eps/equipment-lifecycle-events.ts);
  state, handlers, API contracts preserved in
  [`page.tsx`](../../../apps/web/src/app/eps/[id]/page.tsx). Verified: full
  gate + `git diff --check` (web 79.4, F=36, SOLID=25; packages 94.1, F=0,
  SOLID=0).
- **C6.5** — Setup wizard payload builder extracted to
  [`setup-payload.ts`](../../../apps/web/src/app/setup/setup-payload.ts);
  `handleExecuteSetup` payload shape, API contract, navigation behavior
  preserved. Commit: `9203fa6`.
- **C6.6** — Warehouse submit request builder extracted to
  [`warehouse-submit.ts`](../../../apps/web/src/app/wms/warehouses/warehouse-submit.ts);
  submit payload, endpoint selection, validation preserved. Commit: `5613e7a`.
- **C6.7** — Audit-history branch of
  [`EquipmentOperationalTabs.tsx`](../../../apps/web/src/components/eps/EquipmentOperationalTabs.tsx)
  extracted to
  [`EquipmentAuditHistoryTab.tsx`](../../../apps/web/src/components/eps/EquipmentAuditHistoryTab.tsx);
  lifecycle timeline, loading/empty states, `StatusBadge`, `DataTableWrapper`,
  JSON changes rendering preserved. Verified: quality baseline (web 80.3,
  F=34, SOLID=24; packages 94.1, F=0, SOLID=0). Commits: `f3950df`
  (implementation), `6ea24e1` (documentation).
- **C6.8** — WMS dashboard deficit item extracted to
  [`WmsDeficitItem.tsx`](../../../apps/web/src/components/wms/WmsDeficitItem.tsx);
  deficit presentation and indicator calculation preserved, dashboard data
  fetching/API contracts unchanged. Verified: lint, tsc, quality baseline
  (web 79.7, F=36, SOLID=25), `git diff --check`. Commits: `370bf87`
  (implementation), `8d7ffe3` (documentation).

## Result

All listed sub-stories closed; remaining candidates from the original C6
priority table were superseded by the standalone C7–C17 stories and phases
G/H/I.
