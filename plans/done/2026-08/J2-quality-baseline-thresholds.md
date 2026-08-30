---
id: J2
title: Raise quality baseline thresholds after phases G/H closed
status: done
phase: J
priority: P2
risk: low
skills: [code-reviewer]
opened: 2026-08-30
closed: 2026-08-30
commits: [d576796]
gates: [check:quality]
---

# J2 — Raise quality baseline thresholds after phases G/H closed

## Problem

Actual metrics had drifted far from the configured thresholds (81.1 vs
78.0; F=33 vs 38). A quality regression of up to 3 points or +5 F-files
would pass the gate silently — the gate had stopped protecting against
regression.

## Scope

In
[`scripts/check-quality-baseline.mjs`](../../../scripts/check-quality-baseline.mjs),
raised the web thresholds: average score 78 → 80, F-grade 38 → 34, leaving
roughly a 1-point margin above the measured fact so natural noise does not
break the build. Explicitly run **after** phases G–H closed, to avoid
moving thresholds twice.

## Result

- Thresholds raised; `node scripts/check-quality-baseline.mjs` PASS against
  the post-G/H measurement.
- Threshold table synchronized between this plan and
  [`.agents/rules/code_quality.md`](../../../.agents/rules/code_quality.md)
  at the time (that duplication is now removed by this restructuring — see
  [`docs/quality/QUALITY_BASELINE.md`](../../../docs/quality/QUALITY_BASELINE.md)
  as the sole current source).
- Commit: `d576796` — `chore(quality): raise web baseline thresholds to 80/34`.
