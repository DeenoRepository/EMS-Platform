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

const tsxBin = path.resolve('node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

const child = spawn(tsxBin, ['--test', ...testFiles], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
