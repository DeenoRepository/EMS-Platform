# Security route audit

> **Generated file — do not hand-edit.** Regenerate with
> `python scripts/route_audit.py --report`. This heuristic scan checks for
> the presence of rate-limiting and auth/RBAC call patterns in every
> `apps/web/src/app/api/**/route.ts` file — it does not verify correctness,
> only presence. Manual sign-off for known false positives (e.g. the login
> endpoint itself, ownership-scoped routes) is recorded in the latest
> inspection snapshot under
> [`docs/quality/inspections/`](inspections/), not here.
>
> Measured at: 2026-08-30

## Summary

| Metric | Count |
|---|---:|
| Total route files scanned | 85 |
| Without rate limiting | 0 |
| Without any auth pattern | 2 |
| Only `getCurrentUser()`, no RBAC check | 10 |
| Sensitive path without rate limit | 0 |

Sensitive path prefixes checked: `auth, setup, import, report, admin, backup, database, dump`.

## Routes with no auth pattern detected

- `apps/web/src/app/api/auth/login/route.ts`
- `apps/web/src/app/api/srm/webhooks/[id]/route.ts`


## Sensitive routes without rate limiting

_None_


## Routes using getCurrentUser() without an explicit RBAC check

- `apps/web/src/app/api/auth/logout/route.ts`
- `apps/web/src/app/api/auth/me/route.ts`
- `apps/web/src/app/api/files/[...path]/route.ts`
- `apps/web/src/app/api/notifications/[id]/read/route.ts`
- `apps/web/src/app/api/notifications/read-all/route.ts`
- `apps/web/src/app/api/notifications/route.ts`
- `apps/web/src/app/api/setup/execute/route.ts`
- `apps/web/src/app/api/setup/status/route.ts`
- `apps/web/src/app/api/setup/test-db/route.ts`
- `apps/web/src/app/api/setup/test-ldap/route.ts`


## All routes without rate limiting

_None_


---

## Reproducing this report

```bash
python scripts/route_audit.py --report
```
