# Backlog — unscheduled work

Items here have no open story file and no assigned phase order. They are
listed as trigger conditions, not commitments. When a trigger condition is
met, promote the item: create `plans/active/<id>-<slug>.md` from
[`plans/templates/story.md`](templates/story.md), remove the row below, run
`node scripts/plans-index.mjs`.

| ID | Title | Trigger condition | Notes |
|---|---|---|---|
| D | Broader type-safety pass (remove remaining `unknown`/`any` at external JSON boundaries) | Next time a bug traces back to an untyped SRM/Jira/WMS API boundary | Do not run as a repository-wide sweep. `D.1` and `D.4` (GitLab/Redmine `testConnection()` narrowing) are already closed — see `plans/done/2026-08/`. Pick one adjacent boundary at a time. |
| J4 | Redis-backed rate limit store | Only when planning a multi-instance deployment | Single-instance `InMemoryRateLimitStore` in [`apps/web/src/lib/rate-limit.ts`](../apps/web/src/lib/rate-limit.ts) is correct as-is for one node; this is not a defect. Must implement the same store interface, default to `memory`, fail-open on Redis unavailability with `logger.error`. |

---

This file is not auto-generated. Update it by hand when backlog items are
added, promoted, or dropped.
