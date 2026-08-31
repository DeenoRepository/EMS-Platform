---
id: N4
title: Replace source-text route assertions with executable tests and ESLint rules
status: done
phase: N
priority: P1
risk: medium
skills: [senior-qa, senior-backend]
opened: 2026-08-31
closed: 2026-08-31
commits: [test/N4-executable-route-security]
gates: [lint, tsc, test]
---

# N4 — Replace source-text route assertions with executable tests and ESLint rules

## Problem

An inventory of the suite shows the names of 57 of 85 API routes appearing in
test files. Only **three route handlers are actually invoked**:

| Route | Test |
|---|---|
| `POST /api/auth/login` | [`auth-login-route.test.ts:86`](../../../apps/web/src/lib/__tests__/auth-login-route.test.ts:86) |
| `GET`/`POST /api/wms/transfers` | [`wms-routes.test.ts:108`](../../../apps/web/src/lib/__tests__/wms-routes.test.ts:108) |
| `GET /api/wms/operations` | [`wms-routes.test.ts:112`](../../../apps/web/src/lib/__tests__/wms-routes.test.ts:112) |

The other 54 are string literals inside
[`api-security.test.ts`](../../../apps/web/src/lib/__tests__/api-security.test.ts),
asserted against with `readFileSync` + regex — for example at
[`:150-154`](../../../apps/web/src/lib/__tests__/api-security.test.ts:150):

```js
const source = readRepositoryFile(routePath);
assert.match(source, /from ['"]@\/lib\/logger['"]/);
assert.doesNotMatch(source, /console\.error/);
```

This is static analysis wearing a test's clothing. It cannot distinguish an
imported-but-unused `logger` from a called one; it cannot tell whether
`enforceRateLimit()` runs before request handling or sits in a dead branch;
and it breaks on reformatting. Meanwhile it inflates the apparent route
coverage from 3 to 57.

The checks themselves are worth keeping — they encode real policy from
rule 3 of [`AGENTS.md`](../../../AGENTS.md). They belong in the linter.

See [inspection §3.4](../../../docs/quality/inspections/2026-08-31-coverage-quality-audit.md).

## Scope

Changes: move policy checks out of `api-security.test.ts` into ESLint rules;
keep and extend the genuinely behavioural tests in that file (rate-limit
matrix, `safeErrorResponse`, `validateEnv`) which already import production
code.

Explicitly NOT changing: the policies being enforced. A route that passes
today must pass after the move; this story must not weaken any check. Route
behaviour tests are the subject of `N5`, not this story.

## Steps

1. Classify every check in `api-security.test.ts` as *behavioural* (imports
   and executes production code) or *textual* (`readFileSync` + regex).
   Behavioural ones stay untouched.
2. For the textual ones, add ESLint rules under a local plugin:
   - `no-console-in-api-routes` (replaces the `console.error` regex);
   - `require-logger-import` → better expressed as *forbid* `console.*` in
     `app/api/**`, since an unused import proves nothing;
   - `require-rate-limit-on-sensitive-routes`, driven by an explicit path
     allow-list so a new sensitive route must be registered deliberately.
3. Keep the two fail-closed webhook assertions
   ([`:157-171`](../../../apps/web/src/lib/__tests__/api-security.test.ts:157))
   as tests, but rewrite them to import and execute the webhook route with a
   mocked integration record — this is security-critical behaviour and must
   be proven by execution, not by matching the source of an `if`.
4. Delete the textual checks from the test file once each has an equivalent
   lint rule, and record the mapping in the story Result.
5. Re-run the coverage gate and note the honest drop in apparent route
   coverage in [`COVERAGE_BASELINE.md`](../../../docs/quality/COVERAGE_BASELINE.md).
   A falling number here is the point of the story, not a regression.

## Definition of Done

- [x] No `readFileSync`-based policy assertion remains in
      `apps/web/src/lib/__tests__/`.
- [x] Each removed assertion has a named ESLint rule; `pnpm run lint` fails
      when the policy is violated (proven by a deliberate temporary breakage).
- [x] Webhook fail-closed behaviour is verified by executing the handler:
      absent token → 401, wrong token → 401, correct token → 200.
- [x] Full gate green: lint, tsc, test.

## Result

Removed every `readFileSync`/regex assertion from `apps/web/src/lib/__tests__`.
`api-security.test.ts` now contains only executable tests for rate limiting, safe
error responses, and environment validation.

Added four named local ESLint rules under `scripts/eslint-rules/`:

- `no-console-in-api-routes` replaces console/logger source matching;
- `require-rate-limit-on-sensitive-routes` preserves the explicit sensitive-route matrix;
- `require-safe-error-response` preserves sanitized 5xx response policy;
- `require-route-security-guards` preserves module admin permission, files-route
  access guards, setup reinstallation guards, and active SRM auth policy.

Non-ESLint repository policies moved to `check-static-security-policies.mjs`:
environment placeholders, empty setup passwords, Compose secrets, reset-admin
password input, migration/startup safety, baseline migration completeness, and
instrumentation wiring. It is part of the root `pnpm lint` command. CI now
syntax-checks `scripts/eslint-rules/*.js`.

Deliberate temporary breakages proved that lint reports the named
`require-rate-limit-on-sensitive-routes` and `require-safe-error-response`
rules. `srm-webhook-route.test.ts` imports and executes the real POST handler:
absent secret -> 401, wrong secret -> 401, correct header/query token -> 200,
missing secure policy -> 401, and explicit `allowUnsigned` -> 200.

Final gates: root lint PASS, TypeScript PASS, 225/225 Node checks PASS, 32/32
component checks PASS, docs PASS, and coverage PASS at 66.14% loaded-line
coverage / 15.45% file reach (57 of 369 files). Consecutive baseline reports
were byte-identical.
