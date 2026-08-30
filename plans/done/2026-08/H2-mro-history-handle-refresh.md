---
id: H2
title: Extract MRO history filter/sort model (cx 21)
status: done
phase: H
priority: P1
risk: low
skills: [senior-frontend, code-reviewer]
opened: 2026-08-30
closed: 2026-08-30
commits: [ad87f52]
gates: [lint, tsc, test, check:quality]
---

# H2 — Extract MRO history filter/sort model

## Problem

[`mro/history/page.tsx`](../../../apps/web/src/app/mro/history/page.tsx) —
the filter+sort `useMemo` was cx 21; file average cx 15.0 (highest among
pages at the time).

## Scope

Separated pure filtering/aggregation/normalization from side effects
(`fetch`, `setState`). Pure part extracted into
[`history-model.ts`](../../../apps/web/src/app/mro/history/history-model.ts)
(filter/sort/buildView), following the pattern of
[`schedule-execution-model.ts`](../../../apps/web/src/app/mro/schedule-execution-model.ts).

## Result

- Extracted function cx ≤ 10; behavior unchanged.
- API calls and state ownership stayed in the page.
- Full gate — PASS.
- Commit: `ad87f52` — `refactor(mro): extract maintenance history model`.
