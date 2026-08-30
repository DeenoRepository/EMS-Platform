---
id: A1
title: Remove demo Jira token from env templates, block LDAP default password
status: done
phase: A
priority: P1
risk: low-medium
skills: [senior-security, senior-backend]
opened: 2026-08-29
closed: 2026-08-29
commits: []
gates: [lint, tsc, test, route_audit, check:quality]
---

# A1 — Remove demo Jira token from env templates, block LDAP default password

## Problem

[`.env.example`](../../../.env.example) contained `JIRA_API_TOKEN=adminpassword`.
`validateEnv()` for LDAP only rejected `password`/`changeme`, not
`adminpassword`.

## Scope

Replace the demo Jira token with a placeholder; extend `DANGEROUS_DEFAULTS` /
LDAP `forbiddenValues` to include `adminpassword`. Did not touch a user's
local `.env` or the dev compose stack (that is A3).

## Result

- `.env.example` now uses `REPLACE_WITH_JIRA_TOKEN`.
- LDAP bind/admin password validated against `DANGEROUS_DEFAULTS`.
- Regression tests added in
  [`apps/web/src/lib/__tests__/api-security.test.ts`](../../../apps/web/src/lib/__tests__/api-security.test.ts):
  template no longer contains `adminpassword` as a token value;
  `validateEnv({ force: true })` fails on LDAP `adminpassword` when
  `LDAP_ENABLED=true`.
- Verified: 153 tests passed; lint/tsc/route audit/quality baseline PASS.
- Commit: `fix(security): remove demo Jira token from env examples and block LDAP default password`
