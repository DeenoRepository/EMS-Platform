---
id: A2
title: Fail-closed webhook secret policy for active SRM integrations
status: done
phase: A
priority: P1
risk: medium
skills: [senior-security, senior-backend, strict-api, jira-expert]
opened: 2026-08-29
closed: 2026-08-29
commits: []
gates: [lint, tsc, test, route_audit, check:quality]
---

# A2 — Fail-closed webhook secret policy for active SRM integrations

## Problem

If an integration had no `webhookSecret` / `apiToken` / `apiKey` / `token`,
`POST /api/srm/webhooks/[id]` accepted inbound requests without any
authentication.

## Scope

Fail-closed for active integrations: require a secret on create/update when
`isActive === true`; reject unsigned webhook payloads on active integrations
with `401` unless an explicit `authConfig.allowUnsignedWebhooks === true`
opt-in is set. Preserved the existing fail-closed comparison pattern
`!providedToken || providedToken !== webhookSecret`.

## Result

- Active unsigned integrations now return 401 unless explicitly opted out.
- Create/update routes reject active integrations without secure webhook
  auth.
- Configured secrets still require a matching token; secrets are masked and
  preserved through sanitized PUT payloads.
- Verified: 156 tests passed; lint/tsc/route audit PASS.
- Commit: `fix(security): reject unsigned SRM webhooks unless explicitly allowed`
