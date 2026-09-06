import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEARCH_DIRS = ['packages', 'apps/web/src/lib/__tests__'];
// Existing exception retained until the login runtime/mocking setup is repaired.
const EXCLUDED_PATHS = new Set(['apps/web/src/lib/__tests__/login.test.ts']);
const IGNORED_DIRS = new Set(['node_modules', '.next', 'dist', '.turbo']);

export function findTestFiles(root, directory, excluded = EXCLUDED_PATHS) {
  const results = [];
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const relative = join(directory, entry.name);
    if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
      results.push(...findTestFiles(root, relative, excluded));
    } else if (entry.isFile() && /\.test\.(?:ts|tsx|js|mjs|cjs)$/.test(entry.name)) {
      const normalized = relative.replace(/\\/g, '/');
      if (!excluded.has(normalized)) results.push(normalized);
    }
  }
  return results.sort();
}

export function childExitCode(result) {
  if (result.error || result.signal || !Number.isInteger(result.status)) return 1;
  return result.status;
}

export function runTests() {
  // Discovery errors must fail the run rather than silently omitting a directory.
  const files = SEARCH_DIRS.flatMap((directory) => findTestFiles(ROOT_DIR, directory)).sort();
  if (files.length === 0) throw new Error('No test files discovered');
  console.log(`Discovered ${files.length} test files:`);
  files.forEach((file) => console.log(` - ${file}`));
  EXCLUDED_PATHS.forEach((file) => console.warn(`Excluded (login runtime setup pending): ${file}`));

  const require = createRequire(import.meta.url);
  const cli = require.resolve('tsx/cli');
  const result = spawnSync(process.execPath, [cli, '--test', ...files], {
    stdio: 'inherit',
    shell: false,
    cwd: ROOT_DIR,
  });
  if (result.error) console.error('Unable to start tests:', result.error.message);
  if (result.signal) console.error('Test process terminated by signal:', result.signal);
  return childExitCode(result);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = runTests();
  } catch (error) {
    console.error('Test runner failed:', error);
    process.exitCode = 1;
  }
}
