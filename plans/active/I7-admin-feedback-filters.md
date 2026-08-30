---
id: I7
title: Extract admin/feedback filters (cx 17)
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

# I7 — Extract admin/feedback filters

## Problem

[`apps/web/src/app/admin/feedback/page.tsx`](../../apps/web/src/app/admin/feedback/page.tsx)
is 619 lines with the page component at cx 17.

## Scope

Extract filter state and filter-toolbar wiring into a shared pattern
consistent with `FilterToolbar` usage elsewhere (per
[`.agents/rules/ui_design_code.md`](../../.agents/rules/ui_design_code.md)).

## Steps

1. Read the file completely; identify filter branches contributing to cx 17.
2. Extract filter reducer/state-derivation into a pure function or hook.
3. Keep API fetch and mutation handlers (approve/reject/comment) in the page.

## Definition of Done

- [ ] Page component cx ≤ 10.
- [ ] Filter behavior (status, date range, search) unchanged.
- [ ] Full gate green: lint, tsc, `pnpm test`, quality baseline.

## Result

_Not yet closed._
