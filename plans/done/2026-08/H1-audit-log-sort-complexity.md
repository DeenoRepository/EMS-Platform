---
id: H1
title: Extract audit log sorting comparators (cx 22)
status: done
phase: H
priority: P1
risk: low
skills: [senior-frontend, code-reviewer]
opened: 2026-08-30
closed: 2026-08-30
commits: [09c88a0]
gates: [lint, tsc, test, check:quality]
---

# H1 — Extract audit log sorting comparators

## Problem

[`admin/audit-log/page.tsx`](../../../apps/web/src/app/admin/audit-log/page.tsx) —
`sortAuditLogs` was cx **22** (highest in UI code at the time),
`handleRequestSort` cx 11, `handleResetFilters` 56 lines.

## Scope

Extracted into
[`audit-log-sort.ts`](../../../apps/web/src/app/admin/audit-log/audit-log-sort.ts),
following the pattern of
[`schedule-sort.ts`](../../../apps/web/src/app/mro/schedule-sort.ts) and
`inventory-sort.ts`: replaced the `if/switch` cascade with a comparator map
(`Record<SortKey, Comparator>`). Only pure functions extracted — state and
effects stayed in the page.

## Result

- `sortAuditLogs` cx ≤ 10; sort order identical to before.
- Unit tests added for comparators (per-field ↑/↓, null values, stability).
- Full gate — PASS.
- Commit: `09c88a0` — `refactor(admin): extract audit log sorting comparators`.
