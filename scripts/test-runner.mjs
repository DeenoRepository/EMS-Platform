import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';

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

const routeCoverageCheck = spawnSync(process.execPath, ['scripts/check-route-test-coverage.mjs'], {
  stdio: 'inherit',
  env: process.env,
});
if (routeCoverageCheck.status !== 0) {
  console.error('[test-runner] ERROR: API route test coverage gate failed.');
  process.exit(routeCoverageCheck.status ?? 1);
}

const testFiles = [
  ...findTestFiles('packages'),
  ...findTestFiles(path.join('apps', 'web', 'src')),
];

const emptyTestFiles = testFiles.filter((filePath) => {
  const source = readFileSync(filePath, 'utf8');
  return !/\b(?:test|it)\s*\(/.test(source);
});
if (emptyTestFiles.length > 0) {
  console.error('[test-runner] ERROR: discovered test files with zero checks:');
  for (const filePath of emptyTestFiles) console.error(`  ${filePath}`);
  process.exit(1);
}

// Check count is the primary regression guard. File count is only a lower,
// catastrophic-discovery guard; empty placeholder files cannot satisfy the
// meaningful floor.
const MINIMUM_EXECUTED_CHECK_COUNT = 342;
const MINIMUM_TEST_FILE_COUNT = 40;

console.log(`[test-runner] Found ${testFiles.length} test file(s).`);
if (testFiles.length < MINIMUM_TEST_FILE_COUNT) {
  console.error(
    `[test-runner] ERROR: discovered ${testFiles.length} test files; ` +
      `minimum catastrophic floor is ${MINIMUM_TEST_FILE_COUNT}.`,
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
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
});

let capturedOutput = '';
function relay(chunk, target) {
  const text = chunk.toString();
  capturedOutput += text;
  target.write(text);
}

child.stdout.on('data', (chunk) => relay(chunk, process.stdout));
child.stderr.on('data', (chunk) => relay(chunk, process.stderr));
child.on('error', (error) => {
  console.error('[test-runner] Failed to start Node test process:', error.message);
  process.exit(1);
});
child.on('exit', (code) => {
  if ((code ?? 0) !== 0) {
    process.exit(code ?? 1);
    return;
  }

  const summaryMatches = [
    ...capturedOutput.matchAll(/^\D*tests\s+(\d+)\s*$/gim),
  ];
  const executedChecks = summaryMatches.length
    ? Number.parseInt(summaryMatches.at(-1)[1], 10)
    : null;

  if (executedChecks === null) {
    console.error(
      `[test-runner] ERROR: test process succeeded but the executed-check summary ` +
        `could not be parsed (required floor: ${MINIMUM_EXECUTED_CHECK_COUNT}; ` +
        `discovered files: ${testFiles.length}).`,
    );
    process.exit(1);
    return;
  }

  if (executedChecks < MINIMUM_EXECUTED_CHECK_COUNT) {
    console.error(
      `[test-runner] ERROR: executed ${executedChecks} checks; minimum is ` +
        `${MINIMUM_EXECUTED_CHECK_COUNT}. Discovered ${testFiles.length} test files ` +
        `(catastrophic file floor: ${MINIMUM_TEST_FILE_COUNT}).`,
    );
    process.exit(1);
    return;
  }

  console.log(
    `[test-runner] Guard PASS: ${executedChecks} executed checks across ` +
      `${testFiles.length} discovered files.`,
  );
  process.exit(0);
});
