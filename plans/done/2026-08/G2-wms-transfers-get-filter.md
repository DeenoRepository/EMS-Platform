---
id: G2
title: Extract transfers query filter builder (GET cx 14)
status: done
phase: G
priority: P1
risk: low
skills: [senior-backend, strict-api]
opened: 2026-08-30
closed: 2026-08-30
commits: [9ec1a41]
gates: [lint, tsc, test, route_audit, check:quality]
---

# G2 — Extract transfers query filter builder

## Problem

[`transfers/route.ts`](../../../apps/web/src/app/api/wms/transfers/route.ts) —
`GET` was 131 lines / cx 14; `POST` 65 lines. File average cx 14.0.

## Scope

Extracted `where`-clause building and Prisma-result-to-DTO mapping into
[`wms-transfers-service.ts`](../../../apps/web/src/lib/wms-transfers-service.ts)
(`isTransfersAdmin`, `resolveUserWarehouseIds`) rather than a new module.
Warehouse-scoping (МОЛ) behavior covered by tests in
[`wms-transfers.test.ts`](../../../apps/web/src/lib/__tests__/wms-transfers.test.ts).

## Result

- `GET` handler reduced; response shape unchanged.
- Warehouse-scoping preserved and test-covered.
- Full gate (`pnpm test`, `route_audit.py`, quality baseline) — PASS.
- Commit: `9ec1a41` — `refactor(wms): extract transfers query filter builder`.
