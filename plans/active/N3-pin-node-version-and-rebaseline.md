---
id: N3
title: Pin the Node version and re-establish a reproducible coverage baseline
status: active
phase: N
priority: P0
risk: medium
skills: [senior-qa, ci-cd-pipeline-builder]
opened: 2026-08-31
closed: null
commits: []
gates: [lint, test, docs]
---

# N3 — Pin the Node version and re-establish a reproducible coverage baseline

## Problem

[`COVERAGE_BASELINE.md`](../../docs/quality/COVERAGE_BASELINE.md) publishes
78.32 % line coverage / 21.68 % file coverage over 80 loaded files. A direct
re-measurement on Node v24.15.0 produced **67.28 % / 11.92 % over 44 files**.

The gap is not a regression in the code — it is the coverage reporter
changing its output format between Node 22 (flat paths) and Node 24
(indented tree), interacting with the parser defect tracked in `N2`.

The repository does not pin a Node version anywhere:

* no `.nvmrc`, no `.node-version`;
* no `engines` field in [`package.json`](../../package.json);
* CI hard-codes `node-version: 22` at
  [`ci.yml:32`](../../.github/workflows/ci.yml:32) and
  [`:137`](../../.github/workflows/ci.yml:137).

So a metric that gates merges takes a different value depending on which
machine computed it. Worse, [`ci.yml:92-95`](../../.github/workflows/ci.yml:92)
runs `--report` and then `git diff --exit-code`: any developer who
regenerates the baseline on Node 24 breaks CI, and the failure message
points at the doc rather than the version mismatch.

See [inspection §3.3](../../docs/quality/inspections/2026-08-31-coverage-quality-audit.md).

## Scope

Changes: add `.nvmrc`, add `engines` to the root
[`package.json`](../../package.json), make CI read the pinned version instead
of a literal, add a runtime version assertion to
[`check-coverage.mjs`](../../scripts/check-coverage.mjs), regenerate
[`COVERAGE_BASELINE.md`](../../docs/quality/COVERAGE_BASELINE.md).

Explicitly NOT changing: the metric definitions, the ratchet policy, or any
test. Depends on `N1` (suite must be green) and `N2` (parser must be
correct) — thresholds set before both land would encode the wrong number.

## Steps

1. Add `.nvmrc` containing the chosen major (`22`, matching current CI) and
   an `engines: { "node": ">=22 <25" }` field to the root package.json.
2. Change both CI jobs to `node-version-file: .nvmrc` so the pin has exactly
   one source of truth.
3. In `check-coverage.mjs`, assert the running major is within the supported
   range; exit 1 with an actionable message naming `.nvmrc` otherwise. This
   converts a silent wrong number into a loud stop.
4. Re-measure on the pinned version after `N1`+`N2` and set
   `THRESHOLDS.lineCoverageAmongLoadedFiles` and
   `THRESHOLDS.fileCoverageRatio` to the floor of the measured values.
5. Regenerate the baseline doc and confirm `git diff --exit-code` is clean on
   a second consecutive run.
6. Record the pinned-version requirement in the environment-setup section of
   [`AGENTS.md`](../../AGENTS.md) and in
   [`scripts/README.md`](../../scripts/README.md).

## Definition of Done

- [ ] `.nvmrc` and `engines` present; both CI jobs consume `node-version-file`.
- [ ] `check-coverage.mjs` refuses to run on an unsupported major.
- [ ] Two consecutive `node scripts/check-coverage.mjs --report` runs leave
      the baseline byte-identical.
- [ ] Published thresholds equal the floor of the freshly measured values,
      with the measuring Node version named in the doc.
- [ ] `pnpm check:docs` green.

## Result

_To be filled on close._
