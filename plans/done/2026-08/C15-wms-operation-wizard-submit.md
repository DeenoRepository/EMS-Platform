---
id: C15
title: Extract WMS operation wizard submit payload builder
status: done
phase: C
priority: LOW
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: [47e3e02]
gates: [lint, tsc, check:quality]
---

# C15 — Extract WMS operation wizard submit payload builder

## Result

Submit payload builder extracted to
[`operation-submit.ts`](../../../apps/web/src/components/wms/operation-submit.ts);
transfer and standard operation payload shapes, trimming, optional fields,
and component state ownership preserved. Verified: lint, tsc, targeted
quality checker, quality baseline (web 80.4, F=34, SOLID=24),
`git diff --check` — PASS. Commit: `47e3e02`.
