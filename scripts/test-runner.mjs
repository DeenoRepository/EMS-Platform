import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { readdirSync, statSync } from 'node:fs';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';
process.env.TSX_TSCONFIG_PATH =
  process.env.TSX_TSCONFIG_PATH || 'apps/web/tsconfig.json';

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  '.turbo',
  '.git',
  'coverage',
  'playwright-report',
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

  for (const entry of entries) {
    const filePath = path.join(dir, entry);
    let stat;
    try {
      stat = statSync(filePath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry)) results.push(...findTestFiles(filePath));
    } else if (entry.endsWith('.test.ts')) {
      // React component tests are *.test.tsx and belong exclusively to Vitest.
      results.push(filePath);
    }
  }

  return results;
}

const testFiles = [
  ...findTestFiles('packages'),
  ...findTestFiles(path.join('apps', 'web', 'src')),
];

const MINIMUM_TEST_FILE_COUNT = 45;
console.log(`[test-runner] Found ${testFiles.length} test file(s).`);
if (testFiles.length < MINIMUM_TEST_FILE_COUNT) {
  console.error(
    `[test-runner] ERROR: expected at least ${MINIMUM_TEST_FILE_COUNT} test files, ` +
      `but found only ${testFiles.length}.`,
  );
  process.exit(1);
}

const coverageMode = process.argv.slice(2).includes('--coverage');
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
child.on('exit', (code) => process.exit(code ?? 0));
