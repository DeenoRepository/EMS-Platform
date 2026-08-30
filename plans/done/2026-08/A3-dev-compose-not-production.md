---
id: A3
title: Local dev compose stops masquerading as production
status: done
phase: A
priority: P2
risk: medium
skills: [docker-development, senior-security]
opened: 2026-08-29
closed: 2026-08-29
commits: []
gates: [lint, tsc, test, check:quality]
---

# A3 — Local dev compose stops masquerading as production

## Problem

[`docker-compose.yml`](../../../docker-compose.yml) shipped fallback
`postgrespassword`, `adminpassword`, a static JWT, and `NODE_ENV=production`.

## Scope

Marked the file as local-development-only, switched to `NODE_ENV=development`,
and required `.env` values (`POSTGRES_PASSWORD`, `DATABASE_URL`,
`JWT_SECRET`, LDAP passwords) without plaintext fallback — matching the
existing strictness of the production/offline compose files. Install scripts
and `docker-compose.offline.yml` were not touched beyond verifying they still
read correctly.

## Result

- `docker-compose.yml` labeled LOCAL DEVELOPMENT ONLY, `NODE_ENV=development`.
- Dev compose requires secrets via `.env`, no plaintext fallback.
- Prod/offline compose confirmed already free of plaintext fallback.
- Installers document that production guidance points only to
  `docker-compose.prod.yml` / `docker-compose.offline.yml`.
- Compose config validation and security regression test pass.
- Commit: `fix(security): stop shipping production NODE_ENV with default secrets in dev compose`
