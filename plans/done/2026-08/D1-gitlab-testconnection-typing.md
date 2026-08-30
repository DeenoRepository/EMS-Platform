---
id: D.1
title: Narrow GitLab testConnection() response from unknown
status: done
phase: D
priority: P2
risk: low
skills: [strict-api, senior-backend]
opened: 2026-08-30
closed: 2026-08-30
commits: [c5b39df]
gates: [lint, tsc, check:quality]
---

# D.1 — Narrow GitLab testConnection() response from unknown

## Scope

GitLab adapter's `testConnection()` response narrowed from `unknown` through
a local type guard, in
[`apps/web/src/lib/srm-providers/gitlab-adapter.ts`](../../../apps/web/src/lib/srm-providers/gitlab-adapter.ts).
Behavior and API contract preserved. This is a bounded, single-boundary
change — not part of a repository-wide `any`/`unknown` sweep (see
[`plans/BACKLOG.md`](../../BACKLOG.md) item D for the broader scope, which
remains open).

## Result

Commit: `c5b39df`.
