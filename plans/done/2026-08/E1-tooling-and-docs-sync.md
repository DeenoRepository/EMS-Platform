---
id: E
title: Tooling and documentation sync after 2026-08-30 audit
status: done
phase: E
priority: LOW
risk: low
skills: [code-reviewer]
opened: 2026-08-30
closed: 2026-08-30
commits: []
gates: [lint, tsc, test, check:quality]
---

# E — Tooling and documentation sync after 2026-08-30 audit

## Scope

1. Rewrote §3 of
   [`.agents/rules/code_quality.md`](../../../.agents/rules/code_quality.md)
   with the then-current 33-file F-grade list, split into P1 (by `cx`) / P2
   (by size) / false-positive.
2. Updated §4: `jira-service.ts` was already split into `lib/jira/*` —
   section converted to a reference decomposition example.
3. Removed a duplicated paragraph about Phase D (§7).
4. Updated the expected `pnpm test` result from "113+" to the actual 160.
5. Confirmed `quality-web.json` / `quality-packages.json` are not committed.

## Result

Commit: `docs: refresh inspection reports and quality rules after 2026-08-30 audit`.

Note: this story's own deliverable (the F-file list embedded in
`code_quality.md`) was itself later identified as a duplication problem
(findings E1/E2/E3 of the 2026-08-30 inspection) and is being resolved
structurally by the `plans/` + `docs/quality/QUALITY_BASELINE.md`
reorganization — see this restructuring's own commit.
