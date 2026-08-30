---
id: C17
title: Extract MRO schedule normalization / execution model
status: done
phase: C
priority: LOW
risk: low
skills: [senior-frontend]
opened: 2026-08-30
closed: 2026-08-30
commits: [8f2b4e0]
gates: [lint, tsc, check:quality]
---

# C17 — Extract MRO schedule normalization / execution model

## Result

Schedule normalization extracted to
[`schedule-execution-model.ts`](../../../apps/web/src/app/mro/schedule-execution-model.ts);
checklist mapping, equipment/plan data, notes, wizard behavior, execution
request body, state ownership, and API contracts preserved in
[`page.tsx`](../../../apps/web/src/app/mro/page.tsx). Verified baseline:
web 80.6, F-grade 33, smells 2361, SOLID 24; packages 94.1, F-grade 0,
SOLID 0. Commit: `8f2b4e0`.
