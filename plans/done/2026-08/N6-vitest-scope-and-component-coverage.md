---
id: N6
title: Widen vitest discovery beyond components/ui and measure component coverage
status: done
phase: N
priority: P1
risk: medium
skills: [senior-qa, senior-frontend]
opened: 2026-08-31
closed: 2026-08-31
commits: [test/N6-component-coverage-gate]
gates: [lint, tsc, test]
---

# N6 — Widen vitest discovery beyond components/ui and measure component coverage

## Problem

[`vitest.config.ts:26`](../../../apps/web/vitest.config.ts:26) restricts
discovery to a single directory:

```ts
include: ['src/components/ui/__tests__/**/*.test.tsx'],
```

A React test written anywhere else is silently ignored. This is exactly the
blind spot that story `M1` removed from
[`test-runner.mjs`](../../../scripts/test-runner.mjs) for node:test, left
in place for vitest — and the project's own convention is to co-locate tests
with the code they cover, so the next component story will walk straight
into it.

Current reach: 4 test files against 179 `.tsx` production files (2.2 %), and
all four cover design-system primitives (`StatCard`, `StatusBadge`,
`EmptyState`/`SearchInput`, `ConfirmDialog`). No domain form, table, or
wizard is covered.

Component coverage is also unmeasured: `test:components` runs without
`--coverage`, and [`check-coverage.mjs`](../../../scripts/check-coverage.mjs)
only parses node:test output. The 32 vitest checks influence no metric, so
deleting them would trip no gate.

See [inspection §3.6](../../../docs/quality/inspections/2026-08-31-coverage-quality-audit.md).

## Scope

Changes: [`vitest.config.ts`](../../../apps/web/vitest.config.ts) include
pattern and coverage settings; the `EXCLUDED_TEST_ROOTS` list in
[`test-runner.mjs`](../../../scripts/test-runner.mjs); the coverage gate to
account for the component suite; a first batch of component tests.

Explicitly NOT changing: the runner split itself — node:test for logic,
vitest for React — which is settled in
[`ADR-0001`](../../../docs/architecture/decisions/ADR-0001-component-test-runner.md).

## Steps

1. Broaden the include pattern to `src/**/*.test.tsx` and make the node:test
   runner exclude every `.test.tsx` instead of one hard-coded directory, so
   the two runners stay disjoint by file extension rather than by path.
   Verify no file is picked up by both and none by neither.
2. Enable `coverage` in the vitest config (v8 provider, `json-summary` +
   `text` reporters) scoped to `src/components/**` and `src/app/**`.
3. Teach the coverage gate to read the vitest summary and report a third
   metric, "component line coverage", with its own ratchet threshold set to
   the first measured value.
4. Add a guard mirroring `MINIMUM_TEST_FILE_COUNT`: fail if vitest discovers
   fewer files than the recorded floor, so a config error cannot silently
   empty the suite.
5. Write a first batch of tests for the highest-traffic domain components,
   prioritising those with conditional rendering and user input over
   presentational wrappers.
6. Record the component-coverage threshold in
   [`COVERAGE_BASELINE.md`](../../../docs/quality/COVERAGE_BASELINE.md).

## Definition of Done

- [x] A `.test.tsx` placed outside `components/ui` is executed — proven by
      adding one and observing it in the run output.
- [x] No test file is executed by both runners; none is skipped by both.
- [x] `pnpm --filter @ems/web test:components` emits a coverage summary.
- [x] The coverage gate enforces a component-coverage threshold.
- [x] Discovery floor guard present and tripping when the include pattern
      is broken.
- [x] Full gate green: lint, tsc, test.

## Result

Vitest discovery now uses `src/**/*.test.tsx`. Node's native runner discovers
only `*.test.ts`, making runner ownership disjoint by extension rather than by
hard-coded directories. The Node floor is 45 files; Vitest's configured-file
floor is 6 and is measured via `vitest list --filesOnly`. A deliberate broken
include pattern matched zero files and triggered the guard.

Added `@vitest/coverage-v8` and enabled V8 text + JSON-summary coverage over
`src/components/**` and non-API `src/app/**`. The central coverage gate runs
both suites, requires the JSON summary, and enforces a separate component line
coverage ratchet.

Two domain tests outside `components/ui` prove broadened discovery:

- `WmsStockZoneCell.test.tsx`: editable/foreign-warehouse branches and cell action;
- `AdminFeedbackFilters.test.tsx`: search/filter rendering, MUI select interaction, reset.

Final results: Node runner 45 files / 305 checks, Vitest 6 files / 38 checks.
Coverage gate: 68.87% Node loaded-line coverage, 18.97% Node file reach
(70/369), and 1.89% component line coverage. Ratchets are 68%, 18%, and 1%.
Two consecutive combined reports were byte-identical.
