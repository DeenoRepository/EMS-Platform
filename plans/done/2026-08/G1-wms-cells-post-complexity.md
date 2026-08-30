---
id: G1
title: Reduce POST /api/wms/zones/[id]/cells complexity (cx 25 → ≤10)
status: done
phase: G
priority: P1
risk: medium
skills: [senior-backend, strict-api, zero-hallucination-coder]
opened: 2026-08-30
closed: 2026-08-30
commits: [9841052]
gates: [lint, tsc, test, route_audit, check:quality]
---

# G1 — Reduce POST /api/wms/zones/[id]/cells complexity

## Problem

[`route.ts`](../../../apps/web/src/app/api/wms/zones/[id]/cells/route.ts) —
`POST` had cx **25** (highest in the project), 140 lines; `DELETE` 60 lines.
File average cx 14.7. This is server-side business logic touching the
database — a branching error here corrupts warehouse data, not just
cosmetics. API contract (request/response shape, status codes) was not
allowed to change.

## Scope

Extracted pure functions into
[`cell-generation.ts`](../../../apps/web/src/app/api/wms/zones/[id]/cells/cell-generation.ts):
range parsing/validation (rows, racks, shelves), cell-code batch generation,
conflict detection against existing cells. Route keeps: rate limit → auth →
RBAC → helper calls → Prisma transaction → `safeErrorResponse()`.

## Result

- `route.ts` graded D(63); new `cell-generation.ts` graded A(100).
- Helper covered by unit tests (valid range, empty range, duplicates,
  invalid format, limit exceeded).
- `route_audit.py`: rate limit and RBAC confirmed still in place.
- Full gate (lint, tsc, 160/160 tests, quality baseline) — PASS.
- Commit: `9841052` — `refactor(wms): extract warehouse cell generation from zones API`.
