---
id: B4
title: Replace remaining console.warn/error with logger in API
status: done
phase: B
priority: LOW
risk: low
skills: [senior-backend]
opened: 2026-08-29
closed: 2026-08-29
commits: []
gates: [lint, tsc, test]
---

# B4 — Replace remaining console.warn/error with logger in API

## Problem

The 2026-08-29 inspection found 4 `console.warn/error` calls in production
API paths outside the B1 bounded list:

| File | Line | Type | Context |
|---|---|---|---|
| `api/srm/issues/route.ts` | 156 | `console.warn` | Audit log write failure |
| `api/eps/import/execute/route.ts` | 134 | `console.error` | Custom field creation failure during import |
| `api/eps/import/execute/route.ts` | 326 | `console.error` | Equipment import execution failure |
| `api/setup/execute/route.ts` | 162 | `console.warn` | `.env` write to disk failure |

## Scope

Replace each with `logger.warn`/`logger.error` carrying structured context
(e.g. `{ error, context: 'srm-issues-audit' }`), preserving all existing
catch-block behavior (best-effort semantics unchanged).

## Result

- 0 remaining `console.warn/error/log` in `apps/web/src/app/api/**/*.ts`.
- Verified: 160 tests passed, 0 failed; lint/tsc PASS; route_audit.py, theme
  check, quality baseline PASS.
- Commit: `refactor(api): replace remaining console.warn/error with structured logger`
