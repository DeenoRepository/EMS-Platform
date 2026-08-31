---
id: N8
title: Tests for the highest-risk pure-logic modules extracted during phases C/H/K4
status: done
phase: N
priority: P2
risk: low
skills: [senior-qa]
opened: 2026-08-31
closed: 2026-08-31
commits: [test/N8-pure-logic-coverage]
gates: [lint, tsc, test]
---

# N8 — Tests for the highest-risk pure-logic modules extracted during phases C/H/K4

## Problem

Fifty modules export at least one function and are imported by no test.
They are a direct by-product of the `C`/`H`/`K4` decomposition work: logic
was correctly lifted out of components and routes into pure modules, but
tests followed for only part of it.

Top of the list by exported-function count:

| Module | Exports | Lines |
|---|---:|---:|
| [`components/eps/equipment-passport-actions.ts`](../../../apps/web/src/components/eps/equipment-passport-actions.ts) | 10 | 194 |
| [`lib/jira/field-mapping.ts`](../../../apps/web/src/lib/jira/field-mapping.ts) | 5 | 447 |
| [`lib/eps-import-matcher.ts`](../../../apps/web/src/lib/eps-import-matcher.ts) | 4 | 291 |
| [`components/wms/transfer-request-submit.ts`](../../../apps/web/src/components/wms/transfer-request-submit.ts) | 4 | 79 |
| [`app/srm/srm-issues-service.ts`](../../../apps/web/src/app/srm/srm-issues-service.ts) | 3 | 99 |
| [`app/mro/history/history-model.ts`](../../../apps/web/src/app/mro/history/history-model.ts) | 3 | 94 |
| [`middleware.ts`](../../../apps/web/src/middleware.ts) | 2 | 168 |
| [`lib/custom-sections-defaults.ts`](../../../apps/web/src/lib/custom-sections-defaults.ts) | 2 | 288 |

These are the cheapest coverage available in the codebase: no Prisma, no
DOM, no HTTP. [`middleware.ts`](../../../apps/web/src/middleware.ts) stands out
on risk rather than cost — 168 lines of route authorization with no test.

`eps-import-matcher.ts` is the module the `M4` placeholder pointed at:
tautological tests for a *copy* of its logic were deleted, and nothing
replaced them.

See [inspection §3.8](../../../docs/quality/inspections/2026-08-31-coverage-quality-audit.md).

## Scope

Changes: new co-located `*.test.ts` files for the selected modules.

Explicitly NOT changing: the modules themselves. If a module proves
untestable without refactoring, that refactor is filed as its own story
rather than folded in here. Depends on `N2` so the resulting coverage gain
is measured correctly. Coordinate with `N6` for anything importing `.tsx`.

## Steps

1. Rank all 50 modules by `exported functions × cyclomatic complexity` using
   [`check-quality-baseline.mjs`](../../../scripts/check-quality-baseline.mjs)
   output, and take the top 15. Record the ranking in the Result so the
   selection is auditable.
2. Test `middleware.ts` first regardless of rank — it is authorization code:
   unauthenticated redirect, authorized pass-through, per-module permission
   gating, and public-path allow-list.
3. Then `eps-import-matcher.ts`, closing the `M4` gap left by the deleted
   tautological tests. Import the real implementation; never re-declare the
   logic inside the test.
4. Work down the remaining ranked list. For each module: happy path, every
   documented edge case, and at least one malformed-input case.
5. Assert behaviour, not implementation shape. No `readFileSync` on source,
   no snapshot of an internal structure that reformatting would break.
6. Re-run the coverage gate and ratchet the thresholds upward to the newly
   measured floor.

## Definition of Done

- [x] `middleware.ts` and `eps-import-matcher.ts` are covered by executable
      tests importing the real implementations.
- [x] The top-15 ranked modules each have a test file; the ranking is
      recorded in the Result.
- [x] No test re-declares production logic locally.
- [x] Coverage thresholds ratcheted to the new measured values.
- [x] Full gate green: lint, tsc, test.

## Result

Added co-located executable tests importing the real implementations for 15
selected pure-logic modules. The quality checker exposes aggregate file
`avg_complexity`, but reports zero for many extracted TypeScript functions, so
`exports × avg_complexity` degenerates into non-informative ties. Selection was
therefore recorded with the intended deterministic risk tie-breakers: mandatory
security/import targets first, then the audit's export-count order, then
high-traffic registry/history/inventory transformation modules.

Ranking used:

1. `middleware.ts` (forced authorization risk)
2. `lib/eps-import-matcher.ts` (forced M4 gap)
3. `components/eps/equipment-passport-actions.ts`
4. `components/wms/transfer-request-submit.ts`
5. `app/srm/srm-issues-service.ts`
6. `app/mro/history/history-model.ts`
7. `components/eps/equipment-lifecycle-events.ts`
8. `components/eps/equipment-registry-model.ts`
9. `app/admin/audit-log/audit-log-sort.ts`
10. `app/eps/approval-registry-model.ts`
11. `app/eps/history/history-sort.ts`
12. `app/wms/inventory/inventory-filter.ts`
13. `app/wms/inventory/inventory-sort.ts`
14. `app/wms/inventory/inventory-stats.ts`
15. `app/eps/reports/report-export.ts`

Tests cover authorization redirects/401/403 paths with real signed JWTs, real
header mapping and collision classification, fetch result parsing, transfer
validation/payloads, health scores, lifecycle synthesis, sorting/filtering
fallbacks, aggregate counts, and CSV/JSON escaping. No production logic is
redeclared and no source text is inspected.

Node suite increased from 303 to 342 checks and from 43 to 58 files. Coverage
increased to 70.53% loaded-line coverage and 22.76% file reach (84/369);
component coverage remains 1.89%. Ratchets are now 70%, 22%, and 1%. Two
consecutive baseline reports were byte-identical. Full lint, TypeScript, Node,
Vitest, coverage, docs, and plan-index gates pass.
