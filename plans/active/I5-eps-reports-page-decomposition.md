---
id: I5
title: Decompose eps/reports/page.tsx (largest file, 15 functions)
status: active
phase: I
priority: P2
risk: low
skills: [senior-frontend]
opened: 2026-08-30
closed: null
commits: []
gates: [lint, tsc, check:quality]
---

# I5 — Decompose eps/reports/page.tsx

## Problem

[`apps/web/src/app/eps/reports/page.tsx`](../../apps/web/src/app/eps/reports/page.tsx)
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

- [ ] File reduced below 500 lines across the sequence of commits.
- [ ] Report generation, export, and template save/load behavior unchanged.
- [ ] Full gate green after each commit: lint, tsc, quality baseline.

## Result

_Not yet closed._
