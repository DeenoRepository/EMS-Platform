import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for EMS-Platform E2E smoke tests.
 *
 * Isolated from the unit test runner (scripts/test-runner.mjs / `pnpm test`):
 * run via `pnpm --filter @ems/web test:e2e`, never as part of `pnpm test`.
 * See plans/done/2026-08/L4-e2e-smoke-coverage.md and scripts/README.md.
 *
 * Prerequisites (documented in scripts/README.md):
 *   - A reachable local PostgreSQL server (global-setup.ts provisions its
 *     own ephemeral database on it — never the dev/prod database).
 *   - `pnpm --filter @ems/database generate` already run.
 *   - `pnpm build` already run (tests run against the production build via
 *     `next start`, not `next dev`, to match real deployment behavior).
 */
const PORT = process.env.E2E_PORT || '3100';
const BASE_URL = `http://127.0.0.1:${PORT}`;

// A dedicated, non-dangerous secret for the E2E-only server process.
// Never reused for any real environment; only satisfies env-validate.ts's
// minLength/forbidden-defaults checks so the server starts under
// NODE_ENV=production without tripping L1's validateEnv() guard.
const E2E_JWT_SECRET = 'e2e_playwright_smoke_test_jwt_secret_not_for_prod_use_only';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),
  fullyParallel: false, // smoke suite is small; sequential avoids DB row races
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Use pnpm exec instead of node_modules/.bin/next so the same config
    // starts on Windows and POSIX shells.
    command: 'pnpm exec next start -p ' + PORT,
    cwd: __dirname,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NODE_ENV: 'production',
      PORT,
      JWT_SECRET: E2E_JWT_SECRET,
      // middleware.ts's isSetupCompleted() fetches this URL internally to
      // check /api/setup/status — must point at this same E2E server, not
      // the default localhost:3000, or every navigation would 404/hang.
      NEXTAUTH_URL: BASE_URL,
      DATABASE_URL: `postgresql://${process.env.E2E_DB_USER || 'postgres'}:${process.env.E2E_DB_PASSWORD || 'postgres'}@${process.env.E2E_DB_HOST || 'localhost'}:${process.env.E2E_DB_PORT || '5432'}/ems_e2e_test?schema=public`,
    },
  },
});
