import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { readdirSync, statSync } from 'node:fs';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';

// `TSX_TSCONFIG_PATH` is required so that tsx's Node ESM loader resolves the
// `@/...` path aliases defined in `apps/web/tsconfig.json`.  Without it, a
// test that imports a Next.js route or any lib that uses `@/lib/...` fails
// immediately with `Cannot find module '@/lib/auth-guard'` because tsx falls
// back to the root-level `tsconfig.json` which has no `paths` section.
// See docs/quality/inspections/2026-08-31-test-coverage-inspection.md §3.5.
process.env.TSX_TSCONFIG_PATH = process.env.TSX_TSCONFIG_PATH || 'apps/web/tsconfig.json';

// Directories whose contents are never test files.
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  '.turbo',
  '.git',
  'coverage',
  'playwright-report',
  // E2E specs need a live Postgres + production build — excluded from pnpm test.
  // See apps/web/playwright.config.ts and plans/active/M5-e2e-in-ci.md.
  'e2e',
]);

function findTestFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const file of entries) {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = statSync(filePath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.has(file)) {
        results.push(...findTestFiles(filePath));
      }
    } else if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

// Discover every *.test.ts / *.test.tsx across the whole monorepo, excluding
// directories that can never contain runnable unit tests (e2e, build outputs,
// package manager caches).  This replaces the former two-directory hard-list
// that silently missed tests placed next to their modules — see
// plans/active/M1-test-runner-discovers-all-tests.md for the original defect.
const testFiles = [
  ...findTestFiles('packages'),
  ...findTestFiles(path.join('apps', 'web', 'src')),
];

// Guard: prevent a configuration error from silently dropping tests.
// Raise this floor whenever the suite legitimately grows past it.
const MINIMUM_TEST_FILE_COUNT = 36;

console.log(`[test-runner] Found ${testFiles.length} test file(s).`);

if (testFiles.length < MINIMUM_TEST_FILE_COUNT) {
  console.error(
    `[test-runner] ERROR: expected at least ${MINIMUM_TEST_FILE_COUNT} test files, ` +
      `but found only ${testFiles.length}. ` +
      `Check that no search paths were accidentally excluded.`,
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const coverageMode = args.includes('--coverage');

// `--import tsx` (Node's native ESM loader hook) is required rather than
// invoking tsx's own CLI script: `node:test`'s `mock.module()` API needs
// `--experimental-test-module-mocks`, and that flag only takes effect on
// modules loaded through Node's loader chain. tsx's CLI transforms test
// files via a CJS `Module._compile` hook that bypasses this chain, so
// `mock.module` is `undefined` there even with the flag set (see
// docs/quality/inspections/2026-08-30-inspection.md §7 Q1 /
// plans/done/2026-08/J1-mock-prisma-auth-guard-tests.md).
const nodeArgs = [
  '--experimental-test-module-mocks',
  ...(coverageMode ? ['--experimental-test-coverage'] : []),
  '--import',
  'tsx',
  '--test',
  ...testFiles,
];

const child = spawn(process.execPath, nodeArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
