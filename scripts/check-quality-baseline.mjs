#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const reportPaths = process.argv.slice(2);
if (reportPaths.length === 0) {
  console.error('Usage: node scripts/check-quality-baseline.mjs <quality-report.json> [...]');
  process.exit(2);
}

const baseline = {
  'apps/web/src': {
    minimumAverageScore: 75.5,
    maximumFGradeFiles: 39,
    maximumCodeSmells: 2226,
    maximumSolidViolations: 30,
  },
  packages: {
    minimumAverageScore: 91.2,
    maximumFGradeFiles: 2,
    maximumCodeSmells: 87,
    maximumSolidViolations: 0,
  },
};

let failed = false;

for (const reportPath of reportPaths) {
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
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

  console.log(`Quality baseline: ${baselineKey}`);
  for (const check of checks) {
    console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.message}`);
    if (!check.passed) failed = true;
  }
}

process.exit(failed ? 1 : 0);
