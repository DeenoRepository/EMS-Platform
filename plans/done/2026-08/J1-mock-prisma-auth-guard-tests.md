---
id: J1
title: Mock Prisma in auth-guard tests to remove DB dependency
status: done
phase: J
priority: P2
risk: low
skills: [senior-qa]
opened: 2026-08-30
closed: 2026-08-30
commits: [9514761]
gates: [test]
---

# J1 — Mock Prisma in auth-guard tests to remove DB dependency

## Problem

Three tests in
[`auth-guard.test.ts`](../../../apps/web/src/lib/__tests__/auth-guard.test.ts)
attempted a real Prisma connection (`Can't reach database server at
localhost:5432`) and hung on timeouts: 4.1s, 4.1s, 8.2s — roughly 20s of a
34s total run. Tests passed via fallbacks but the run was slowed 2x+, output
was polluted with `prisma:error`, and results depended on whether the
developer's local DB was up (CI flake risk).

## Scope

Mocked `@ems/database` (`prisma.user.findUnique`,
`prisma.systemSetting.findUnique`) using `node:test`'s built-in
`mock.module()`. Since `mock.module()` does not work through tsx's CJS
transpilation, `scripts/test-runner.mjs` was changed to invoke
`node --experimental-test-module-mocks --import tsx --test` instead of
calling the tsx CLI directly — this was a required precondition, not
optional tooling polish.

## Result

- Full `pnpm test` run: 33.6s → 2.66s (160/160 passing).
- `prisma:error` noise eliminated.
- Commit: `9514761`.
