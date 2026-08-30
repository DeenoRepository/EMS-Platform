---
id: C5
title: EPS reports builder + Smart Import wizard decomposition
status: done
phase: C
priority: MEDIUM
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: []
gates: [lint, tsc, test, route_audit, check:theme, check:quality]
---

# C5 — EPS reports builder + Smart Import wizard decomposition

## Problem

EPS reports page (842 lines) and Smart Import wizard (820 lines) each
bundled column building / export logic, and file analysis / import
execution, respectively.

## Sub-stories

- **C5.2b.1** — Smart Import STEP 0 (upload) extracted to
  [`SmartImportUploadStep.tsx`](../../../apps/web/src/components/eps/SmartImportUploadStep.tsx);
  selected file, analyzing state, analyze/download handlers stayed in the
  wizard. Verified: lint, tsc, 160 tests, route audit, theme check, quality
  baseline (web 79.1, F=36, SOLID=25).
- **C5.2b.2** — Mapping/missing-fields presentation extracted to
  [`SmartImportMappingStep.tsx`](../../../apps/web/src/components/eps/SmartImportMappingStep.tsx);
  resolutions, column mapping, callbacks preserved. Verified: quality
  baseline (web 79.1, F=36, SOLID=25).
- **C5.2b.3** — Preview/conflict presentation extracted to
  [`SmartImportPreviewStep.tsx`](../../../apps/web/src/components/eps/SmartImportPreviewStep.tsx);
  conflict strategy, preview filters/counts, table rows, execute/back
  callbacks preserved. Verified: quality baseline (web 79.2, F=36, SOLID=25).
- **C5.2b.4** — Execute payload preparation extracted to
  [`smart-import-submit.ts`](../../../apps/web/src/components/eps/smart-import-submit.ts);
  `rows`, `columnMapping`, `newFieldDefinitions`, `ignoredHeaders`,
  `conflictStrategy` preserved without API contract change. Verified:
  quality baseline (web 79.3, F=36, SOLID=25).

## Result

Commits: `refactor(eps): extract report builder content from page`,
`refactor(eps): extract smart import analyze/execute handlers`.
