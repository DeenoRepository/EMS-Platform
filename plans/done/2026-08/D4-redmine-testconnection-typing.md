---
id: D.4
title: Narrow Redmine testConnection() response from unknown
status: done
phase: D
priority: P2
risk: low
skills: [strict-api, senior-backend]
opened: 2026-08-30
closed: 2026-08-30
commits: [06f7964]
gates: [lint, tsc, check:quality]
---

# D.4 — Narrow Redmine testConnection() response from unknown

## Scope

Redmine adapter's `testConnection()` response narrowed from `unknown`
through a local type guard, in
[`apps/web/src/lib/srm-providers/generic-rest-adapter.ts`](../../../apps/web/src/lib/srm-providers/generic-rest-adapter.ts).
Behavior and API contract preserved. Bounded, single-boundary change — see
[`plans/BACKLOG.md`](../../BACKLOG.md) item D for the remaining scope.

## Result

Commit: `06f7964`.
