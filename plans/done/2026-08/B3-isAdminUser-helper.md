---
id: B3
title: Unify admin role checks via isAdminUser() helper
status: done
phase: B
priority: LOW
risk: low
skills: [senior-backend, strict-api]
opened: 2026-08-29
closed: 2026-08-29
commits: []
gates: [lint, tsc, test, route_audit]
---

# B3 — Unify admin role checks via isAdminUser() helper

## Problem

The 2026-08-29 inspection found 37 places across 20+ API routes checking the
admin role string inconsistently: some checked `'admin'`, others
`'administrator'`, one checked both. If the DB stores `'administrator'`,
routes checking only `'admin'` would incorrectly deny access, and vice
versa.

## Scope

Added `isAdminUser(user)` to
[`apps/web/src/lib/auth-guard.ts`](../../../apps/web/src/lib/auth-guard.ts)
returning true for either role string, and replaced all inline
`user.roles.includes('admin')` / `user.roles?.includes('administrator')`
checks across WMS, EPS, Setup, Feedback, Dashboard, Users, and System API
routes with calls to the helper.

**Deliberately not changed:** the inline check in
[`api/auth/login/route.ts:157`](../../../apps/web/src/app/api/auth/login/route.ts)
— it operates on a local `roles` array before the `JwtUserPayload` is
constructed; wrapping it would add indirection with no RBAC benefit.

**Not done:** DB schema changes, role renaming, RBAC permission changes.

## Result

- `isAdminUser(user)` added with unit tests (`admin` role, `administrator`
  role, regular user — all covered).
- Inline admin-role checks unified across the listed API routes; the
  `auth/login` exception is documented in code.
- Verified: 160 tests passed, 0 failed; lint/tsc PASS; route_audit.py, theme
  check, quality baseline PASS.
- Commit: `refactor(auth): unify admin role check via isAdminUser helper`
