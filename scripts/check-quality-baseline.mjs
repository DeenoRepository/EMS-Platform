#!/usr/bin/env node
import { readFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const baseline = {
  'apps/web/src': {
    minimumAverageScore: 78.0,
    maximumFGradeFiles: 38,
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

const reportPaths = process.argv.slice(2);
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

let failed = false;

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
      passed: report.average_score >= limits.minimumAverageScore,
      message: `average score ${report.average_score} >= ${limits.minimumAverageScore}`,
    },
    {
      passed: fGradeFiles <= limits.maximumFGradeFiles,
      message: `F-grade files ${fGradeFiles} <= ${limits.maximumFGradeFiles}`,
    },
    {
      passed: report.total_code_smells <= limits.maximumCodeSmells,
      message: `code smells ${report.total_code_smells} <= ${limits.maximumCodeSmells}`,
    },
    {
      passed: report.total_solid_violations <= limits.maximumSolidViolations,
      message: `SOLID violations ${report.total_solid_violations} <= ${limits.maximumSolidViolations}`,
    },
  ];

  console.log(`\nQuality baseline: ${baselineKey}`);
  for (const check of checks) {
    console.log(`  ${check.passed ? 'PASS' : 'FAIL'} ${check.message}`);
    if (!check.passed) failed = true;
  }
}

process.exit(failed ? 1 : 0);
