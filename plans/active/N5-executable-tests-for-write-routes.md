---
id: N5
title: Executable RBAC and validation tests for the 13 uncovered write routes
status: active
phase: N
priority: P1
risk: high
skills: [senior-qa, senior-backend]
opened: 2026-08-31
closed: null
commits: []
gates: [lint, tsc, test]
---

# N5 — Executable RBAC and validation tests for the 13 uncovered write routes

## Problem

Thirteen API routes perform `create`/`update`/`delete`/`upsert` and are
covered by nothing at all — neither an executable test nor a textual one:

| Route | Lines | `$transaction` |
|---|---:|:---:|
| [`eps/equipment/[id]`](../../apps/web/src/app/api/eps/equipment/[id]/route.ts) | 316 | ✔ |
| [`eps/equipment`](../../apps/web/src/app/api/eps/equipment/route.ts) | 238 | — |
| [`eps/documents`](../../apps/web/src/app/api/eps/documents/route.ts) | 221 | — |
| [`srm/issues`](../../apps/web/src/app/api/srm/issues/route.ts) | 180 | — |
| [`eps/approvals`](../../apps/web/src/app/api/eps/approvals/route.ts) | 176 | — |
| [`system/maintenance`](../../apps/web/src/app/api/system/maintenance/route.ts) | 163 | — |
| [`admin/roles`](../../apps/web/src/app/api/admin/roles/route.ts) | 124 | — |
| [`admin/roles/[id]`](../../apps/web/src/app/api/admin/roles/[id]/route.ts) | 103 | — |
| [`admin/settings`](../../apps/web/src/app/api/admin/settings/route.ts) | 94 | — |
| [`eps/tags`](../../apps/web/src/app/api/eps/tags/route.ts) | 66 | — |
| [`admin/permissions`](../../apps/web/src/app/api/admin/permissions/route.ts) | 59 | — |
| [`notifications/[id]/read`](../../apps/web/src/app/api/notifications/[id]/read/route.ts) | 35 | — |
| [`notifications/read-all`](../../apps/web/src/app/api/notifications/read-all/route.ts) | 31 | — |

`eps/equipment/[id]` is the sharpest risk: 316 lines of transactional write
with zero regression protection.

The technique is already proven in-repo —
[`wms-routes.test.ts`](../../apps/web/src/lib/__tests__/wms-routes.test.ts)
and [`route-harness.ts`](../../apps/web/src/lib/__tests__/helpers/route-harness.ts)
mock `@ems/database` via `mock.module` and assert on real handler responses,
including a check that no PostgreSQL connection is opened. This story applies
that pattern to the uncovered routes.

See [inspection §3.5](../../docs/quality/inspections/2026-08-31-coverage-quality-audit.md).

## Scope

Changes: new test files plus extensions to the shared Prisma mock in
[`route-harness.ts`](../../apps/web/src/lib/__tests__/helpers/route-harness.ts).

Explicitly NOT changing: route behaviour. If a test exposes a genuine
authorization defect, it is filed as a separate story rather than fixed
inline — mixing a fix into a test-coverage story hides the regression from
review. Depends on `N1` (green suite) and `N2` (honest measurement).

## Steps

1. Extend `makePrismaMock()` with the models these routes touch
   (`equipment`, `equipmentDocument`, `approval`, `tag`, `role`,
   `permission`, `notification`, `systemSetting`, `srmIssue`).
2. Order the work by risk, highest first: `eps/equipment/[id]`,
   `eps/equipment`, `eps/approvals`, `srm/issues`, `admin/roles*`,
   then the remainder.
3. For each route and each exported HTTP method, assert the three-point
   authorization contract:
   - anonymous → 401;
   - authenticated without the required permission → 403;
   - authorized → 2xx with the expected response shape.
4. For `eps/equipment/[id]`, additionally assert transactional integrity:
   when a step inside `$transaction` rejects, no partial write is observed
   and the handler returns a sanitized 5xx.
5. Assert input validation on every write path: missing required field →
   400, never a 500 and never a silent success.
6. Keep `assert.equal(dbConnectionAttempts, 0)` in every file — the
   guarantee that unit tests never reach a live database.

## Definition of Done

- [ ] All 13 routes are imported and executed by at least one test.
- [ ] Each exported method has the 401 / 403 / 2xx triple asserted.
- [ ] `eps/equipment/[id]` has an explicit transaction-rollback test.
- [ ] No test opens a database connection.
- [ ] Any authorization defect found is filed as its own story and linked
      from the Result section.
- [ ] Full gate green: lint, tsc, test.

## Result

_To be filled on close._
