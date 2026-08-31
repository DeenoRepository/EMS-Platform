#!/usr/bin/env node
import { existsSync, readFileSync, unlinkSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const baseline = {
  'apps/web/src': {
    minimumAverageScore: 80.0,
    maximumFGradeFiles: 34,
    maximumCodeSmells: 2400,
    maximumSolidViolations: 25,
  },
  packages: {
    minimumAverageScore: 94.0,
    maximumFGradeFiles: 0,
    maximumCodeSmells: 75,
    maximumSolidViolations: 0,
  },
};

const repositoryRoot = path.resolve(process.cwd());
const checkerScript = path.join(
  repositoryRoot,
  '.agents',
  'skills',
  'code-reviewer',
  'scripts',
  'code_quality_checker.py'
);

function runQualityAnalysis(targetDirectory) {
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const result = spawnSync(
    pythonCmd,
    [checkerScript, targetDirectory, '--language', 'typescript', '--json'],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 30 * 1024 * 1024,
    }
  );

  if (result.error) {
    throw new Error(`Failed to execute quality checker for ${targetDirectory}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Quality checker returned non-zero code for ${targetDirectory}: ${result.stderr}`);
  }

  return JSON.parse(result.stdout);
}

function isTestFile(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  return (
    normalized.includes('/__tests__/') ||
    normalized.endsWith('.test.ts') ||
    normalized.endsWith('.test.tsx') ||
    normalized.endsWith('.spec.ts') ||
    normalized.endsWith('.spec.tsx')
  );
}

function restrictToProductionFiles(report) {
  const files = report.files.filter((file) => !isTestFile(file.file));
  return {
    ...report,
    files,
    files_analyzed: files.length,
    average_score:
      files.length === 0
        ? 0
        : Number((files.reduce((sum, file) => sum + file.quality_score, 0) / files.length).toFixed(1)),
    total_code_smells: files.reduce((sum, file) => sum + file.smells.length, 0),
    total_solid_violations: files.reduce((sum, file) => sum + file.solid_violations.length, 0),
  };
}

const rawArgs = process.argv.slice(2);
const isReportMode = rawArgs.includes('--report');
const reportPaths = rawArgs.filter((arg) => arg !== '--report');

let reports = [];

if (reportPaths.length > 0) {
  for (const p of reportPaths) {
    reports.push(JSON.parse(readFileSync(p, 'utf8')));
  }
} else {
  // Direct in-memory execution mode without generating root files
  console.log('Running code quality analysis in-memory...');
  reports.push(runQualityAnalysis('apps/web/src'));
  reports.push(runQualityAnalysis('packages'));
}

// Tests have independent execution and coverage gates. Keep this quality gate
// focused on production source so test fixtures do not distort code-quality
// metrics or F-grade counts.
reports = reports.map(restrictToProductionFiles);

let failed = false;
const resultRows = [];

for (const report of reports) {
  const normalizedDirectory = String(report.directory).replace(/\\/g, '/');
  const baselineKey = Object.keys(baseline).find((key) => normalizedDirectory.endsWith(key));

  if (!baselineKey) {
    console.error(`No approved quality baseline for ${report.directory}`);
    failed = true;
    continue;
  }

  const limits = baseline[baselineKey];
  const fGradeFiles = report.files.filter((file) => file.grade === 'F').length;
  const checks = [
    {
      metric: 'Average score',
      actual: report.average_score,
      comparator: '>=',
      threshold: limits.minimumAverageScore,
      passed: report.average_score >= limits.minimumAverageScore,
      message: `average score ${report.average_score} >= ${limits.minimumAverageScore}`,
    },
    {
      metric: 'F-grade files',
      actual: fGradeFiles,
      comparator: '<=',
      threshold: limits.maximumFGradeFiles,
      passed: fGradeFiles <= limits.maximumFGradeFiles,
      message: `F-grade files ${fGradeFiles} <= ${limits.maximumFGradeFiles}`,
    },
    {
      metric: 'Code smells',
      actual: report.total_code_smells,
      comparator: '<=',
      threshold: limits.maximumCodeSmells,
      passed: report.total_code_smells <= limits.maximumCodeSmells,
      message: `code smells ${report.total_code_smells} <= ${limits.maximumCodeSmells}`,
    },
    {
      metric: 'SOLID violations',
      actual: report.total_solid_violations,
      comparator: '<=',
      threshold: limits.maximumSolidViolations,
      passed: report.total_solid_violations <= limits.maximumSolidViolations,
      message: `SOLID violations ${report.total_solid_violations} <= ${limits.maximumSolidViolations}`,
    },
  ];

  console.log(`\nQuality baseline: ${baselineKey}`);
  for (const check of checks) {
    console.log(`  ${check.passed ? 'PASS' : 'FAIL'} ${check.message}`);
    if (!check.passed) failed = true;
  }

  resultRows.push({
    directory: baselineKey,
    fileCount: report.files.length,
    grade: report.grade ?? null,
    checks,
  });
}

if (isReportMode) {
  writeQualityBaselineReport(resultRows, failed);
}

process.exit(failed ? 1 : 0);

/**
 * Writes docs/quality/QUALITY_BASELINE.md — the single generated source of
 * truth for current quality metrics and thresholds. No other markdown file
 * in this repository should hardcode these numbers; they should link here
 * instead.
 */
function writeQualityBaselineReport(rows, anyFailed) {
  const outDir = path.join(repositoryRoot, 'docs', 'quality');
  const outPath = path.join(outDir, 'QUALITY_BASELINE.md');
  mkdirSync(outDir, { recursive: true });

  const measuredAt = new Date().toISOString().slice(0, 10);
  const overallStatus = anyFailed ? '❌ FAIL' : '✅ PASS';
  const previousMeasuredAt = readPreviousMeasuredAt(outPath);

  const sections = rows
    .map((row) => {
      const header = `### \`${row.directory}\`\n\n`;
      const meta = `Files analyzed: **${row.fileCount}**${row.grade ? `, grade **${row.grade}**` : ''}\n\n`;
      const tableHeader = '| Metric | Actual | Threshold | Status |\n|---|---:|---:|---|\n';
      const tableRows = row.checks
        .map(
          (c) =>
            `| ${c.metric} | ${c.actual} | ${c.comparator} ${c.threshold} | ${c.passed ? '✅ PASS' : '❌ FAIL'} |`
        )
        .join('\n');
      return header + meta + tableHeader + tableRows + '\n';
    })
    .join('\n');

  const content = `# Quality baseline

> **Generated file — do not hand-edit.** Regenerate with
> \`node scripts/check-quality-baseline.mjs --report\`. Thresholds are
> defined in [\`scripts/check-quality-baseline.mjs\`](../../scripts/check-quality-baseline.mjs)
> — that file is the single source of truth for threshold values; this
> document only reports the last measured actuals against them.
>
> Measured at: ${measuredAt}
> Overall gate: ${overallStatus}

No other file in this repository should restate these numbers. Rules files
(e.g. [\`.agents/rules/code_quality.md\`](../../.agents/rules/code_quality.md))
should link here instead of embedding metric values, since any embedded
number goes stale the next time this report is regenerated.

For the detailed per-file F-grade breakdown and specific findings, see the
latest dated snapshot in [\`docs/quality/inspections/\`](inspections/).

---

${sections}
---

## Reproducing this report

\`\`\`bash
node scripts/check-quality-baseline.mjs --report
\`\`\`

This runs \`code_quality_checker.py\` in-memory against \`apps/web/src\` and
\`packages\`, evaluates the results against the thresholds in this script,
and writes this file. It does not commit any intermediate JSON artifacts.
`;

  // CI regenerates this report and then runs `git diff --exit-code` on it. If
  // the measurement date were always "today", an unchanged repository would
  // still produce a diff on any day after the last commit and fail the build
  // for no substantive reason. Only advance the date when something else in
  // the report actually changed.
  const finalContent =
    previousMeasuredAt && previousMeasuredAt !== measuredAt
      ? (() => {
          const rewound = content.replace(
            `> Measured at: ${measuredAt}`,
            `> Measured at: ${previousMeasuredAt}`
          );
          return rewound === readFileIfExists(outPath) ? rewound : content;
        })()
      : content;

  writeFileSync(outPath, finalContent, 'utf8');
  console.log(`\nWrote ${path.relative(repositoryRoot, outPath)}`);
}

/** Returns the file's current contents, or null when it does not exist. */
function readFileIfExists(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
}

/**
 * Reads the `Measured at:` date already recorded in a previously generated
 * report, so an otherwise-identical regeneration can keep it instead of
 * churning the date on every run.
 */
function readPreviousMeasuredAt(filePath) {
  const existing = readFileIfExists(filePath);
  const match = existing?.match(/^> Measured at: (\d{4}-\d{2}-\d{2})$/m);
  return match ? match[1] : null;
}
