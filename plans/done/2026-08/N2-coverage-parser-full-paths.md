---
id: N2
title: Coverage parser must key files by full path, not basename
status: done
phase: N
priority: P0
risk: medium
skills: [senior-qa]
opened: 2026-08-31
closed: 2026-08-31
commits: [fix/N2-coverage-parser-full-paths]
gates: [lint, test]
---

# N2 — Coverage parser must key files by full path, not basename

## Problem

[`check-coverage.mjs:131-154`](../../scripts/check-coverage.mjs:131) builds
the `coveredFiles` set from Node's TAP coverage table. Under Node 24 that
table is rendered as an **indented tree**, not as full paths:

```
ℹ    app                                 |        |          |         |
ℹ     api                                |        |          |         |
ℹ      wms                               |        |          |         |
ℹ       transfers                        |        |          |         |
ℹ        route.ts                        |  31.02 |    73.53 |   73.33 | …
```

The regex at [`:135`](../../scripts/check-coverage.mjs:135) therefore
captures `route.ts`, and the `Set` collapses every same-named file into one
entry. Measured against the real output:

| Metric | Value |
|---|---:|
| Table rows carrying percentages | 55 |
| Unique keys landing in `coveredFiles` | 44 |
| Lost to basename collisions | **11** |
| Discarded by the `includes('file')` filter | 1 (`file-access.ts`) |

Collapsed names: `route.ts`, `get-query.ts`, `patch-update-model.ts`,
`index.ts`, `constants.ts`, `types.ts`.

Two consequences. The "охват файлов" number is systematically understated,
and it is **insensitive to progress**: adding a second tested `route.ts`
cannot move the numerator.

Separately, the guard at
[`:148`](../../scripts/check-coverage.mjs:148) —
`!filePath.includes('file') || filePath.includes('/')` — drops any file
whose name contains the substring `file`. It was meant to skip the `file`
column header and instead silently discards production files.

See [inspection §3.2](../../docs/quality/inspections/2026-08-31-coverage-quality-audit.md).

## Scope

Changes: [`scripts/check-coverage.mjs`](../../scripts/check-coverage.mjs)
parsing logic, plus a unit test for the parser.

Explicitly NOT changing: the two metric definitions, the threshold ratchet
policy, or the CI step wiring. Threshold *values* are updated by `N3` once
the parser is trustworthy — not here.

## Steps

1. Extract the parser into a pure, exported function
   (`parseCoverageTable(rawOutput) -> { lineCoverage, files: string[] }`)
   so it is testable without spawning the suite.
2. Reconstruct full paths by tracking indentation depth: maintain a stack of
   directory segments keyed by the leading-space count, and join it with the
   leaf filename. Handle both the Node 22 flat form and the Node 24 tree
   form — detect which by whether a row already contains a path separator.
3. Replace the `includes('file')` heuristic with an exact match against the
   two known non-data rows (`file` header, `all files` total).
4. Fail loudly instead of silently under-counting: if fewer rows are parsed
   than the number of rows carrying a percentage, exit 1 with a diagnostic.
5. Add `scripts/__tests__/check-coverage-parser.test.ts` with fixtures for
   both output shapes, asserting: full paths reconstructed, no collisions,
   `file-access.ts` retained, `all files` excluded.

## Definition of Done

- [x] `coveredFiles` contains full repository-relative paths.
- [x] Unique key count equals the number of percentage-carrying rows (55 in
      the current suite) — zero collision loss.
- [x] Parser unit test covers Node 22 flat output and Node 24 tree output.
- [x] `file-access.ts` appears in the covered set.
- [x] Full gate green: lint, test.

## Result

Extracted and exported `parseCoverageOutput()` from the gate. It now supports
Node 22 flat paths and Node 24 indented trees, reconstructs repository-relative
paths, normalizes Windows separators, filters only exact header/total rows, and
retains names such as `file-access.ts`.

The gate compares the number of percentage-bearing data rows with the number of
unique reconstructed paths and exits non-zero on any collision. Five regression
tests cover both table shapes, duplicate `route.ts` names, exact header
filtering, missing totals, and directory-row exclusion. The corrected current
report contains 56 unique loaded files with zero collision loss.
