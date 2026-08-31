# Coverage Baseline - EMS-Platform

> **Auto-generated.** Do not edit manually.
> Regenerate: `node scripts/check-coverage.mjs --report`
> Requires: `pnpm install --frozen-lockfile && pnpm db:generate`
> Measured on Node 24.15.0; use `.nvmrc` for reproducibility.

**Measured at:** 2026-08-31

## Metrics

| Metric | Value | Threshold | Status |
|---|---:|---:|---|
| Line coverage among loaded files | 65.79 % | >= 65 % | PASS |
| File-level coverage | 15.18 % | >= 15 % | PASS |

## Detail

- **Files loaded by tests:** 56
- **Total production files:** 369 (all `.ts`/`.tsx` excluding tests, specs, and declarations)
- **Files with zero coverage:** 313 (84.8 %)

## Metric interpretation

**Line coverage among loaded files** is Node's `all files` line percentage.
Files never imported by a test are absent from this denominator.

**File-level coverage** measures test reach: the number of production TypeScript
files present in the coverage table divided by all production TypeScript files.

Together these metrics prevent regressions both inside tested files and in the
number of production files reached by tests.

## Parser correctness

Before N2, files were keyed by basename, so duplicate names such as `route.ts`
collided. The parser now reconstructs full repository-relative paths for Node
24's tree output, supports Node 22's flat output, preserves names containing
`file`, and fails if parsed data rows collapse into fewer unique paths.

See [`check-coverage.mjs`](../../scripts/check-coverage.mjs),
[the parser regression test](../../apps/web/src/lib/__tests__/check-coverage-parser.test.ts),
and [the coverage audit](inspections/2026-08-31-coverage-quality-audit.md).

## Thresholds

Thresholds are declared in [`scripts/check-coverage.mjs`](../../scripts/check-coverage.mjs).
They are a ratchet: raise them when coverage improves and do not lower them for
ordinary changes.
