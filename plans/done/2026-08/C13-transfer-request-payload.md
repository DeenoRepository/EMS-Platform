---
id: C13
title: Extract transfer-request payload preparation
status: done
phase: C
priority: LOW
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: [eb3e82a]
gates: [lint, tsc, check:quality]
---

# C13 — Extract transfer-request payload preparation

## Result

Payload preparation extracted to
[`transfer-request-submit.ts`](../../../apps/web/src/components/wms/transfer-request-submit.ts);
submit payload, validation, and endpoint behavior preserved. Commit:
`eb3e82a`.
