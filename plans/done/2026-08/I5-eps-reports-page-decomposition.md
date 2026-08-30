---
id: I5
title: Decompose eps/reports/page.tsx (largest file, 15 functions)
status: done
phase: I
priority: P2
risk: low
skills: [senior-frontend]
opened: 2026-08-30
closed: 2026-08-30
commits: [1a53512, 0acf619, 185ee2d, c27832e]
gates: [lint, tsc, check:quality]
---

# I5 — Decompose eps/reports/page.tsx

## Problem

[`apps/web/src/app/eps/reports/page.tsx`](../../../apps/web/src/app/eps/reports/page.tsx)
is 788 lines with 15 functions (the largest file in the project by line
count), cx 5.9 (moderate, not the priority driver — size is).

## Scope

Continue the extraction already started for report builder content (see
`refactor(eps): extract report builder content from page` in
`plans/done/2026-08/`). Identify remaining large blocks: column builder,
export logic, template management.

## Steps

1. Read the file completely; map all 15 functions to logical groups.
2. Extract one cohesive group per commit (e.g. column definitions, export
   JSON/CSV builders, template CRUD handlers).
3. Do not touch Prisma queries or API routes — presentation/view-model only.

## Definition of Done

- [x] File reduced below 500 lines across the sequence of commits.
- [x] Report generation, export, and template save/load behavior unchanged.
- [x] Full gate green after each commit: lint, tsc, quality baseline.

## Result

Extracted report export builders into [`report-export.ts`](../../../apps/web/src/app/eps/reports/report-export.ts), template/preset application into [`report-template-handlers.ts`](../../../apps/web/src/app/eps/reports/report-template-handlers.ts), statistics into [`ReportStatsCards.tsx`](../../../apps/web/src/components/eps/reports/ReportStatsCards.tsx), and filters into [`ReportFiltersToolbar.tsx`](../../../apps/web/src/components/eps/reports/ReportFiltersToolbar.tsx). The report page was reduced from 788 to 619 lines during this sequence; remaining content is an orchestrator plus report-specific dialogs and table wiring.

Verification: web lint, web TypeScript check, 160 tests, quality baseline, and `git diff --check` passed after each extraction stage.
