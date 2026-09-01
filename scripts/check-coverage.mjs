#!/usr/bin/env node
/**
 * Coverage gate for EMS-Platform.
 *
 * Metrics:
 * 1. Line coverage among files loaded by at least one Node test.
 * 2. File reach: Node-loaded production TypeScript files / all production files.
 * 3. Component line coverage from the separately-owned Vitest React suite.
 *
 * Usage:
 *   node scripts/check-coverage.mjs
 *   node scripts/check-coverage.mjs --report
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const SUPPORTED_NODE_MAJORS = [22, 24];

// Corrected N2/N3 baseline measured on Node 24.15.0 on 2026-08-31.
// Thresholds are floors of measured values and act as a ratchet.
const THRESHOLDS = {
  lineCoverageAmongLoadedFiles: 74.0,
  fileCoverageRatio: 40.0,
  componentLineCoverage: 1.0,
};

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

const leafNumberRe = /^[\d.]+$/;

function assertSupportedNodeVersion() {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (SUPPORTED_NODE_MAJORS.includes(major)) return;

  console.error(
    `[check-coverage] Node ${process.versions.node} is unsupported. ` +
      `Verified majors: ${SUPPORTED_NODE_MAJORS.join(', ')}.\n` +
      'Use the version declared in .nvmrc before regenerating coverage.',
  );
  process.exit(1);
}

function isProductionFile(filePath) {
  const base = path.basename(filePath);
  return (
    (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) &&
    !base.endsWith('.test.ts') &&
    !base.endsWith('.test.tsx') &&
    !base.endsWith('.spec.ts') &&
    !base.endsWith('.spec.tsx') &&
    !base.endsWith('.d.ts')
  );
}

function walkProductionFiles(dir, results = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry)) walkProductionFiles(fullPath, results);
    } else if (isProductionFile(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Parse Node's experimental coverage table.
 *
 * Node 22 emits flat repository-relative paths. Node 24 emits an indented
 * tree whose data rows contain only a leaf name. The reporter prefix is one
 * character (for example '#' or an info glyph), so removing exactly one
 * character preserves the indentation used to reconstruct full paths.
 *
 * @param {string} rawOutput
 * @returns {{
 *   lineCoverageAmongLoaded: number | null,
 *   coveredFiles: Set<string>,
 *   parsedDataRowCount: number
 * }}
 */
export function parseCoverageOutput(rawOutput) {
  const coveredFiles = new Set();
  const pathStack = [];
  let lineCoverageAmongLoaded = null;
  let parsedDataRowCount = 0;

  for (const line of rawOutput.split('\n')) {
    if (!line.includes('|')) continue;

    const cells = line.slice(1).split('|');
    if (cells.length < 2) continue;

    const rawName = cells[0];
    const name = rawName.trim();
    const lineCell = (cells[1] ?? '').trim();
    const leadingSpaces = rawName.length - rawName.trimStart().length;

    if (!name || name === 'file') continue;
    if (name === 'all files') {
      if (leafNumberRe.test(lineCell)) {
        lineCoverageAmongLoaded = Number.parseFloat(lineCell);
      }
      continue;
    }

    const isDataRow = leafNumberRe.test(lineCell);
    if (name.includes('/') || name.includes('\\')) {
      if (isDataRow) {
        coveredFiles.add(name.replaceAll('\\', '/'));
        parsedDataRowCount += 1;
      }
      continue;
    }

    const depth = Math.max(0, leadingSpaces - 1);
    pathStack[depth] = name;
    pathStack.length = depth + 1;

    if (isDataRow) {
      coveredFiles.add(pathStack.join('/'));
      parsedDataRowCount += 1;
    }
  }

  return { lineCoverageAmongLoaded, coveredFiles, parsedDataRowCount };
}

function runCoverageTests() {
  console.log('[check-coverage] Running Node tests with experimental coverage...');
  return spawnSync(process.execPath, ['scripts/test-runner.mjs', '--coverage'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ||
        'postgresql://dummy:dummy@localhost:5432/dummy?schema=public',
    },
  });
}

function runComponentCoverageTests() {
  console.log('[check-coverage] Running React component tests with V8 coverage...');
  const isWindows = process.platform === 'win32';
  const command = isWindows ? process.env.ComSpec || 'cmd.exe' : 'pnpm';
  const args = isWindows
    ? ['/d', '/s', '/c', 'pnpm --filter @ems/web test:components']
    : ['--filter', '@ems/web', 'test:components'];
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function readComponentLineCoverage() {
  const summaryPath = path.join(
    'apps',
    'web',
    'coverage',
    'components',
    'coverage-summary.json',
  );
  if (!existsSync(summaryPath)) {
    console.error(`[check-coverage] Missing component coverage summary: ${summaryPath}`);
    process.exit(1);
  }

  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const percentage = summary?.total?.lines?.pct;
  if (typeof percentage !== 'number' || !Number.isFinite(percentage)) {
    console.error('[check-coverage] Invalid component line coverage summary.');
    process.exit(1);
  }
  return percentage;
}

function assertSuccessfulTestRun(result, rawOutput) {
  if (result.error) {
    console.error('[check-coverage] Failed to spawn test runner:', result.error.message);
    process.exit(1);
  }

  process.stdout.write(rawOutput);
  if (result.status === 0) return;

  console.error('\n[check-coverage] Tests failed; coverage was not evaluated.');
  process.exit(1);
}

function assertParserResult(parsed) {
  if (parsed.lineCoverageAmongLoaded === null) {
    console.error(
      '[check-coverage] Could not parse the all-files coverage row.\n' +
        'Run `node scripts/test-runner.mjs --coverage` and inspect its table.',
    );
    process.exit(1);
  }

  if (parsed.coveredFiles.size !== parsed.parsedDataRowCount) {
    console.error(
      `[check-coverage] Parser collision: ${parsed.parsedDataRowCount} data rows ` +
        `produced ${parsed.coveredFiles.size} unique paths.`,
    );
    process.exit(1);
  }
}

function calculateMetrics(parsed, componentLineCoverage) {
  const allProductionFiles = [
    ...walkProductionFiles('packages'),
    ...walkProductionFiles(path.join('apps', 'web', 'src')),
  ];
  const totalFiles = allProductionFiles.length;
  const loadedFiles = parsed.coveredFiles.size;
  const fileCoverageRatio = totalFiles === 0 ? 0 : (loadedFiles / totalFiles) * 100;

  return {
    lineCoverageAmongLoaded: parsed.lineCoverageAmongLoaded,
    fileCoverageRatio,
    componentLineCoverage,
    loadedFiles,
    totalFiles,
  };
}

function evaluateChecks(metrics) {
  return [
    {
      label: 'Line coverage among loaded files',
      actual: metrics.lineCoverageAmongLoaded,
      threshold: THRESHOLDS.lineCoverageAmongLoadedFiles,
      passed:
        metrics.lineCoverageAmongLoaded >= THRESHOLDS.lineCoverageAmongLoadedFiles,
    },
    {
      label: 'File-level coverage',
      actual: Number.parseFloat(metrics.fileCoverageRatio.toFixed(2)),
      threshold: THRESHOLDS.fileCoverageRatio,
      passed: metrics.fileCoverageRatio >= THRESHOLDS.fileCoverageRatio,
    },
    {
      label: 'Component line coverage',
      actual: metrics.componentLineCoverage,
      threshold: THRESHOLDS.componentLineCoverage,
      passed: metrics.componentLineCoverage >= THRESHOLDS.componentLineCoverage,
    },
  ];
}

function printResults(checks, metrics) {
  console.log('\n[check-coverage] Results:');
  for (const check of checks) {
    const status = check.passed ? 'PASS' : 'FAIL';
    console.log(
      `  ${status} ${check.label}: ${check.actual}% ` +
        `(threshold: >= ${check.threshold}%)`,
    );
  }
  console.log(`\n  Loaded files:      ${metrics.loadedFiles}`);
  console.log(`  Total prod files:  ${metrics.totalFiles}`);
}

function baselineDate(reportPath, metrics) {
  const today = new Date().toISOString().slice(0, 10);
  if (!existsSync(reportPath)) return today;

  const existing = readFileSync(reportPath, 'utf8');
  const dateMatch = existing.match(/\*\*Measured at:\*\* (\d{4}-\d{2}-\d{2})/);
  const oldLine = existing.match(/Line coverage.*?(\d+\.\d+) %/);
  const oldFile = existing.match(/File-level coverage.*?(\d+\.\d+) %/);
  const oldComponent = existing.match(/Component line coverage.*?(\d+\.\d+) %/);
  const unchanged =
    oldLine &&
    Number.parseFloat(oldLine[1]) === metrics.lineCoverageAmongLoaded &&
    oldFile &&
    Number.parseFloat(oldFile[1]) ===
      Number.parseFloat(metrics.fileCoverageRatio.toFixed(2)) &&
    oldComponent &&
    Number.parseFloat(oldComponent[1]) === metrics.componentLineCoverage;

  return dateMatch && unchanged ? dateMatch[1] : today;
}

function renderBaseline(metrics) {
  const reportPath = path.join('docs', 'quality', 'COVERAGE_BASELINE.md');
  const measuredAt = baselineDate(reportPath, metrics);
  const zeroFiles = metrics.totalFiles - metrics.loadedFiles;
  const zeroRatio =
    metrics.totalFiles === 0 ? 0 : (zeroFiles / metrics.totalFiles) * 100;

  return `# Coverage Baseline - EMS-Platform

> **Auto-generated.** Do not edit manually.
> Regenerate: \`node scripts/check-coverage.mjs --report\`
> Requires: \`pnpm install --frozen-lockfile && pnpm db:generate\`
> Measured on Node ${process.versions.node}; use \`.nvmrc\` for reproducibility.

**Measured at:** ${measuredAt}

## Metrics

| Metric | Value | Threshold | Status |
|---|---:|---:|---|
| Line coverage among loaded files | ${metrics.lineCoverageAmongLoaded.toFixed(2)} % | >= ${THRESHOLDS.lineCoverageAmongLoadedFiles} % | ${metrics.lineCoverageAmongLoaded >= THRESHOLDS.lineCoverageAmongLoadedFiles ? 'PASS' : 'FAIL'} |
| File-level coverage | ${metrics.fileCoverageRatio.toFixed(2)} % | >= ${THRESHOLDS.fileCoverageRatio} % | ${metrics.fileCoverageRatio >= THRESHOLDS.fileCoverageRatio ? 'PASS' : 'FAIL'} |
| Component line coverage | ${metrics.componentLineCoverage.toFixed(2)} % | >= ${THRESHOLDS.componentLineCoverage} % | ${metrics.componentLineCoverage >= THRESHOLDS.componentLineCoverage ? 'PASS' : 'FAIL'} |

## Detail

- **Files loaded by tests:** ${metrics.loadedFiles}
- **Total production files:** ${metrics.totalFiles} (all \`.ts\`/\`.tsx\` excluding tests, specs, and declarations)
- **Files with zero coverage:** ${zeroFiles} (${zeroRatio.toFixed(1)} %)

## Metric interpretation

**Line coverage among loaded files** is Node's \`all files\` line percentage.
Files never imported by a test are absent from this denominator.

**File-level coverage** measures Node-test reach: the number of production
TypeScript files present in the Node coverage table divided by all production
TypeScript files.

**Component line coverage** comes from Vitest V8 coverage over
\`src/components/**\` and non-API \`src/app/**\`. It is intentionally separate from
Node coverage because React tests use jsdom and a dedicated runner.

Together these metrics prevent regressions inside tested files, in Node-test
reach, and across the React component surface.

## Parser correctness

Before N2, files were keyed by basename, so duplicate names such as \`route.ts\`
collided. The parser now reconstructs full repository-relative paths for Node
24's tree output, supports Node 22's flat output, preserves names containing
\`file\`, and fails if parsed data rows collapse into fewer unique paths.

See [\`check-coverage.mjs\`](../../scripts/check-coverage.mjs),
[the parser regression test](../../apps/web/src/lib/__tests__/check-coverage-parser.test.ts),
and [the coverage audit](inspections/2026-08-31-coverage-quality-audit.md).

## Thresholds

Thresholds are declared in [\`scripts/check-coverage.mjs\`](../../scripts/check-coverage.mjs).
They are a ratchet: raise them when coverage improves and do not lower them for
ordinary changes.
`;
}

function writeBaselineIfRequested(metrics) {
  if (!process.argv.slice(2).includes('--report')) return;

  const reportPath = path.join('docs', 'quality', 'COVERAGE_BASELINE.md');
  writeFileSync(reportPath, renderBaseline(metrics), 'utf8');
  console.log(`\n[check-coverage] Report written to ${reportPath}`);
}

function main() {
  assertSupportedNodeVersion();
  const result = runCoverageTests();
  const rawOutput = (result.stdout || '') + (result.stderr || '');
  assertSuccessfulTestRun(result, rawOutput);

  const parsed = parseCoverageOutput(rawOutput);
  assertParserResult(parsed);

  const componentResult = runComponentCoverageTests();
  const componentOutput = (componentResult.stdout || '') + (componentResult.stderr || '');
  assertSuccessfulTestRun(componentResult, componentOutput);
  const componentLineCoverage = readComponentLineCoverage();

  const metrics = calculateMetrics(parsed, componentLineCoverage);
  const checks = evaluateChecks(metrics);
  printResults(checks, metrics);
  writeBaselineIfRequested(metrics);

  if (checks.some((check) => !check.passed)) {
    console.error('\n[check-coverage] Coverage gate FAILED.');
    process.exit(1);
  }

  console.log('\n[check-coverage] Coverage gate PASSED.');
}

const isMainModule =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) main();
