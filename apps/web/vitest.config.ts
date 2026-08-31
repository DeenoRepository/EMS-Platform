import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest configuration for React component tests.
 *
 * Runs separately from the node:test unit suite (scripts/test-runner.mjs).
 * Command: pnpm --filter @ems/web test:components
 *
 * See: docs/architecture/decisions/ADR-0001-component-test-runner.md
 */
export default defineConfig({
  plugins: [react()],

  test: {
    // jsdom simulates a browser DOM for React rendering without a real browser.
    environment: 'jsdom',

    // Load jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.)
    // before each test file, matching the @testing-library convention.
    setupFiles: ['./src/components/ui/__tests__/setup.ts'],

    // Only scan the component test directory — never bleed into src/lib
    // (those are covered by the node:test runner).
    include: ['src/components/ui/__tests__/**/*.test.tsx'],

    globals: true,
  },

  resolve: {
    alias: {
      // Mirror the Next.js tsconfig path alias so @/ imports resolve.
      '@': path.resolve(__dirname, './src'),
    },
  },
});
