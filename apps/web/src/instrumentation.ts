/**
 * instrumentation.ts
 *
 * Next.js runtime entry point, loaded automatically once per server process
 * before any route handler executes (available without a config flag since
 * Next.js 15 — see next.config.mjs history / Next.js release notes).
 *
 * This is the *only* production code path that must import
 * `@/lib/env-validate` for its startup side effect: `validateEnv()` throws on
 * dangerous/default secrets in production, but the import must happen under
 * the Node.js runtime, never the Edge runtime, because `env-validate.ts`
 * uses `fs`/`path` (unavailable on Edge) — see env-validate.ts and
 * plans/active/L1-env-validate-runtime-wiring.md.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/env-validate');
  }
}
