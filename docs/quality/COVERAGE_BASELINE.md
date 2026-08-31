# Coverage Baseline — EMS-Platform

> **Auto-generated.** Do not edit manually.
> Regenerate: `node scripts/check-coverage.mjs --report`
> Requires: `pnpm install --frozen-lockfile && pnpm db:generate`

**Measured at:** 2026-08-31

## Metrics

| Metric | Value | Threshold | Status |
|---|---:|---:|---|
| Line coverage among loaded files | 83.27 % | ≥ 80 % | ✓ |
| File-level coverage (охват файлов) | 20.22 % | ≥ 14 % | ✓ |

## Detail

- **Files loaded by tests:** 74
- **Total production files:** 366 (all `.ts`/`.tsx` excluding `.test.`, `.spec.`, `.d.ts`)
- **Files with zero coverage:** 292 (79.8 %)

### What these metrics mean

**Line coverage among loaded files** is what Node's `--experimental-test-coverage`
reports as "all files | line %". It only counts lines inside files that were
imported by at least one test; files never imported are excluded from the
denominator and therefore do not appear in this number.

**File-level coverage** is computed by dividing the count of files that appeared
in the coverage report by the total count of production TypeScript files on disk.
This is the true indicator of test *reach*: at 11.7 % (2026-08-31 baseline), a
green `pnpm test` offered no protection for 88 % of files.

These two metrics together prevent two different forms of regression:
- Reducing line coverage *within* tested files (metric 1).
- Removing or disabling tests that caused previously-loaded files to drop out
  of coverage (metric 2).

## Thresholds

Thresholds are declared as constants in
[`scripts/check-coverage.mjs`](../../scripts/check-coverage.mjs) — the single
source of truth. They are set as a ratchet: raise them when coverage improves,
never lower them.

| Story | Expected improvement |
|---|---|
| M1 (done) | +8 files discovered → охват файлов ≥ 14 % |
| M3 | +85 API route files → охват файлов ≥ 35 % |
| M6 | +UI components → охват файлов ≥ 50 % |
