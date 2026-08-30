---
id: I8
title: Extract performLogin from login/page.tsx (cx 12)
status: done
phase: I
priority: P2
risk: low
skills: [senior-frontend, senior-security]
opened: 2026-08-30
closed: 2026-08-30
commits: [f289635]
gates: [lint, tsc, check:quality]
---

# I8 — Extract performLogin from login/page.tsx

## Problem

[`apps/web/src/app/login/page.tsx`](../../apps/web/src/app/login/page.tsx)
is 642 lines; `performLogin` is cx 12.

## Scope

Extract `performLogin` branching (credential validation, error mapping,
redirect logic) into a pure/testable function. This file is
security-adjacent (auth entry point) — sign off with
[`.agents/rules/security.md`](../../.agents/rules/security.md) before merge,
no behavior change to rate-limit or Zod validation already in place at the
API layer.

## Steps

1. Read the file completely.
2. Extract error-message mapping and redirect-target resolution into a pure
   function; keep the actual `fetch` call and `setState` in the component.
3. Do not touch `/api/auth/login` — this story is UI-only.

## Definition of Done

- [x] `performLogin` in the component ≤ 30 lines, cx ≤ 8.
- [x] Login success/failure/redirect behavior unchanged (manual smoke:
      valid login, invalid credentials, LDAP failure message).
- [x] Full gate green: lint, tsc, `pnpm test`, quality baseline.

## Result

Extracted login validation and error-message mapping into [`login-flow.ts`](../../apps/web/src/app/login/login-flow.ts). The page retains authentication invocation, local-storage handling, loading/error state, and UI event wiring. The `/api/auth/login` contract was not changed.

Verification: web lint, web TypeScript check, 160 tests, quality baseline, and `git diff --check` passed.
