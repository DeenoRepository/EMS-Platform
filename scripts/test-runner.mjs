import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { readdirSync, statSync } from 'node:fs';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';

function findTestFiles(dir) {
  const results = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = statSync(filePath);
      if (stat && stat.isDirectory()) {
        results.push(...findTestFiles(filePath));
      } else if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
        results.push(filePath);
      }
    }
  } catch (e) {
    // ignore
  }
  return results;
}

const testFiles = [
  ...findTestFiles(path.join('packages', 'auth', 'src')),
  ...findTestFiles(path.join('apps', 'web', 'src', 'lib', '__tests__')),
];

// `--import tsx` (Node's native ESM loader hook) is required here rather than
// invoking tsx's own CLI script: `node:test`'s `mock.module()` API needs
// `--experimental-test-module-mocks`, and that flag only takes effect on
// modules loaded through Node's loader chain. tsx's CLI transforms test
// files via a CJS `Module._compile` hook that bypasses this chain, so
// `mock.module` is `undefined` there even with the flag set (see
// docs/quality/inspections/2026-08-30-inspection.md §7 Q1 /
// plans/done/2026-08/J1-mock-prisma-auth-guard-tests.md).
const child = spawn(
  process.execPath,
  ['--experimental-test-module-mocks', '--import', 'tsx', '--test', ...testFiles],
  {
    stdio: 'inherit',
    env: process.env,
  }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
