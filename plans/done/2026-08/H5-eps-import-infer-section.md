---
id: H5
title: Replace inferSection cascade with rule table (cx 15)
status: done
phase: H
priority: P2
risk: low
skills: [senior-frontend, code-reviewer]
opened: 2026-08-30
closed: 2026-08-30
commits: [36eb1f3]
gates: [lint, tsc, test]
---

# H5 — Replace inferSection cascade with rule table

## Problem

[`eps-import-helpers.ts`](../../../apps/web/src/lib/eps-import-helpers.ts) —
`guessFieldType` was 201 lines (per the parser), `inferSection` cx 15.

## Scope

Replaced the `if` cascade with a rule table,
`SECTION_KEYWORD_RULES: Array<{ match: RegExp | string[]; section: string }>`,
and a linear `Array.find` lookup. Existing tests in
[`eps-import.test.ts`](../../../packages/auth/src/eps-import.test.ts)
extended with cases for each section.

## Result

- `inferSection` cx ≤ 10; classification results identical (regression
  tested against the existing header set).
- Commit: `36eb1f3` — `refactor(eps): replace import section inference cascade with rule table`.
