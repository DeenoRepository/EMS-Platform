---
id: G3
title: Extract operations query filter builder (GET cx 13)
status: done
phase: G
priority: P1
risk: low
skills: [senior-backend, strict-api]
opened: 2026-08-30
closed: 2026-08-30
commits: [95626a6]
gates: [lint, tsc, test, route_audit, check:quality]
---

# G3 — Extract operations query filter builder

## Problem

[`operations/route.ts`](../../../apps/web/src/app/api/wms/operations/route.ts) —
`GET` was 84 lines / cx 13; `POST` 57 lines. File average cx 13.5.

## Scope

Same recipe as G2 for consistency: `isOperationsAdmin` and
`buildOperationsWhereInput` extracted into a new
[`wms-operations-service.ts`](../../../apps/web/src/lib/wms-operations-service.ts).
Warehouse-scoped access permissions preserved.

## Result

- `GET` handler ≤ 50 lines, cx ≤ 10.
- Full gate — PASS.
- Commit: `95626a6` — `refactor(wms): extract operations query filter builder`.
