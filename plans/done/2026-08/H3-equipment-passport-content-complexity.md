---
id: H3
title: Extract equipment passport actions (cx 21)
status: done
phase: H
priority: P1
risk: medium
skills: [senior-frontend, code-reviewer]
opened: 2026-08-30
closed: 2026-08-30
commits: [452ffb4]
gates: [lint, tsc, test, check:quality]
---

# H3 — Extract equipment passport actions

## Problem

[`eps/[id]/page.tsx`](../../../apps/web/src/app/eps/[id]/page.tsx) — 696
lines, `EquipmentPassportContent` cx 21, score F(49), 9 functions. Already
partially decomposed by C6.3, C9–C12 — required reading the file completely
first to determine what remained before extracting further.

## Scope

10 functions (copy/delete/print handlers and related passport action logic)
extracted into
[`equipment-passport-actions.ts`](../../../apps/web/src/app/eps/[id]/equipment-passport-actions.ts).

## Result

- Page component cx reduced from 21; page graded D(68).
- Tabs, dialogs, and permission gating unchanged.
- Full gate — PASS.
- Commit: `452ffb4` — `refactor(eps): extract equipment passport actions`.
