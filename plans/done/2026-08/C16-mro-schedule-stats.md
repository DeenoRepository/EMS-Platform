---
id: C16
title: Extract MRO schedule KPI/statistics calculation
status: done
phase: C
priority: LOW
risk: low
skills: [senior-frontend]
opened: 2026-08-30
closed: 2026-08-30
commits: [4bd77de]
gates: [lint, tsc, check:quality]
---

# C16 — Extract MRO schedule KPI/statistics calculation

## Result

KPI/statistics calculation extracted to
[`schedule-stats.ts`](../../../apps/web/src/app/mro/schedule-stats.ts);
API calls, state ownership, routing, filtering, sorting, pagination, and
shared UI contracts preserved in
[`page.tsx`](../../../apps/web/src/app/mro/page.tsx). Verified baseline:
web 80.5, F-grade 33, smells 2361, SOLID 24; packages 94.1, F-grade 0,
SOLID 0. Commit: `4bd77de`.
