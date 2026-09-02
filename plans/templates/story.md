---
id: XN
title: Short imperative title
status: active
phase: X
priority: P2
risk: low
skills: [senior-frontend]
opened: YYYY-MM-DD
closed: null
commits: []
gates: [lint, tsc]
---

# XN — Short imperative title

## Problem

What is wrong and where (file:line links). Keep to facts already established
by an inspection or a direct code reading — do not restate the whole file.

## Scope

What will change. What will explicitly NOT change (API contract, DB schema,
UI behavior, etc.) — this is what reviewers check first.

## Steps

1. ...
2. ...

## Definition of Done

- [ ] Concrete, checkable condition (e.g. "cx ≤ 10", "0 lint warnings").
- [ ] New/changed behavior is covered by an executable test in the same
      commit, and the test was verified to fail when the behavior regresses
      (see [`.agents/rules/testing.md`](../../.agents/rules/testing.md)).
      Delete this line only for changes with no runtime behavior at all
      (pure markup, docs, config).
- [ ] Full gate green: see `gates:` in front-matter.

## Result

Filled in only when the story is closed. Summarizes what actually changed,
any deviation from the original scope, and links the closing commit(s).

Before moving a story from `plans/active/` to `plans/done/YYYY-MM/`, recalculate
relative links from the final done location and run `node scripts/check-doc-links.mjs`.
