---
id: N6
title: Widen vitest discovery beyond components/ui and measure component coverage
status: active
phase: N
priority: P1
risk: medium
skills: [senior-qa, senior-frontend]
opened: 2026-08-31
closed: null
commits: []
gates: [lint, tsc, test]
---

# N6 — Widen vitest discovery beyond components/ui and measure component coverage

## Problem

[`vitest.config.ts:26`](../../apps/web/vitest.config.ts:26) restricts
discovery to a single directory:

```ts
include: ['src/components/ui/__tests__/**/*.test.tsx'],
```

A React test written anywhere else is silently ignored. This is exactly the
blind spot that story `M1` removed from
[`test-runner.mjs`](../../scripts/test-runner.mjs) for node:test, left
in place for vitest — and the project's own convention is to co-locate tests
with the code they cover, so the next component story will walk straight
into it.

Current reach: 4 test files against 179 `.tsx` production files (2.2 %), and
all four cover design-system primitives (`StatCard`, `StatusBadge`,
`EmptyState`/`SearchInput`, `ConfirmDialog`). No domain form, table, or
wizard is covered.

Component coverage is also unmeasured: `test:components` runs without
`--coverage`, and [`check-coverage.mjs`](../../scripts/check-coverage.mjs)
only parses node:test output. The 32 vitest checks influence no metric, so
deleting them would trip no gate.

See [inspection §3.6](../../docs/quality/inspections/2026-08-31-coverage-quality-audit.md).

## Scope

Changes: [`vitest.config.ts`](../../apps/web/vitest.config.ts) include
pattern and coverage settings; the `EXCLUDED_TEST_ROOTS` list in
[`test-runner.mjs`](../../scripts/test-runner.mjs); the coverage gate to
account for the component suite; a first batch of component tests.

Explicitly NOT changing: the runner split itself — node:test for logic,
vitest for React — which is settled in
[`ADR-0001`](../../docs/architecture/decisions/ADR-0001-component-test-runner.md).

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
   [`COVERAGE_BASELINE.md`](../../docs/quality/COVERAGE_BASELINE.md).

## Definition of Done

- [ ] A `.test.tsx` placed outside `components/ui` is executed — proven by
      adding one and observing it in the run output.
- [ ] No test file is executed by both runners; none is skipped by both.
- [ ] `pnpm --filter @ems/web test:components` emits a coverage summary.
- [ ] The coverage gate enforces a component-coverage threshold.
- [ ] Discovery floor guard present and tripping when the include pattern
      is broken.
- [ ] Full gate green: lint, tsc, test.

## Result

_To be filled on close._
