# ADR-0001: Component Test Runner for `@/components/ui`

**Status:** Accepted  
**Date:** 2026-08-31  
**Story:** [M6 — Ввести компонентное тестирование React](../../../plans/done/2026-08/M6-react-component-testing.md)

---

## Context

`apps/web/src/components/ui` contains 36 shared React components (MUI-based,
Emotion CSS-in-JS) with zero automated tests. M6 requires a component test
runner that:

- renders components in a DOM environment with React 18
- supports TypeScript + JSX without a separate build step
- works with MUI's ThemeProvider (Emotion SSR mocking is not required)
- does not conflict with the existing `node:test` unit runner (`pnpm test`)
- does not require a running browser for basic render/interaction tests

Two options were evaluated:

### Option A — `node:test` + `@testing-library/react` + `jsdom`

**Pros:** single runner technology across the monorepo.  
**Cons:** `node:test` has no native JSX transform. Requires a custom TSX
loader (`tsx`) that pre-processes React components, but `tsx` under
`node:test` does not handle `'use client'` directives or Emotion's
`@emotion/react` JSX pragma correctly without extra configuration.
The integration is possible but brittle and poorly documented.

### Option B — `vitest` + `@testing-library/react` + `jsdom`

**Pros:**
- Native TypeScript + TSX support without a separate loader configuration.
- First-class `jsdom` (and `happy-dom`) environment flag per file or globally.
- `@testing-library/jest-dom` matchers work out of the box via `setupFiles`.
- MUI ThemeProvider wrapping is well-documented and stable.
- Runs as a completely separate command (`test:components`) — `pnpm test`
  (the `node:test` runner) is untouched and cannot accidentally execute
  Playwright or Vitest files.
- Vitest's module aliasing resolves `@/` path aliases from `tsconfig.json`
  with a single `alias` entry, matching Next.js behaviour.

**Cons:** introduces a second test tool alongside `node:test`. Manageable
because `node:test` owns non-UI modules and vitest owns React components.

### Option C — Playwright Component Testing

**Pros:** reuses already-installed Playwright, real browser.  
**Cons:** requires a Vite-based build step even for simple render assertions;
significantly heavier setup; adds 30–60 s to the component test run; overkill
for unit-level render/interaction tests that do not need a real network.

## Decision

**Option B — vitest + @testing-library/react + jsdom.**

Command: `pnpm --filter @ems/web test:components`  
Runner separation ensures `pnpm test` remains unchanged (232 tests,
`node:test`). The CI `e2e` job (M5) is also unaffected.

## Consequences

- `apps/web/devDependencies` gains: `vitest`, `@vitejs/plugin-react`,
  `@testing-library/react`, `@testing-library/user-event`,
  `@testing-library/jest-dom`, `@types/testing-library__jest-dom`.
- `apps/web/vitest.config.ts` configures `jsdom` environment, path aliases,
  and `setupFiles` for jest-dom matchers.
- A `src/components/ui/__tests__/test-utils.tsx` wrapper provides
  `renderWithProviders(ui)` — MUI ThemeProvider + light theme — for all tests.
- Coverage from component tests is NOT merged into the `node:test` coverage
  gate (M2) in this story; that integration is a separate step tracked in
  BACKLOG.
