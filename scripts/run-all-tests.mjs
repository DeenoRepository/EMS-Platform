import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();

// Directories to search for tests
const SEARCH_DIRS = ['packages', 'apps/web/src/lib/__tests__'];

// Excluded files (e.g. tests requiring experimental ESM runtime flags)
const EXCLUDED_FILES = new Set(['login.test.ts']);

function findTestFiles(dir) {
  const fullDir = join(ROOT_DIR, dir);
  let results = [];

  try {
    const entries = readdirSync(fullDir);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue;
      const fullPath = join(fullDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(findTestFiles(join(dir, entry)));
      } else if (entry.endsWith('.test.ts') && !EXCLUDED_FILES.has(entry)) {
        results.push(join(dir, entry).replace(/\\/g, '/'));
      }
    }
  } catch (err) {
    // Directory might not exist yet
  }

  return results;
}

const testFiles = SEARCH_DIRS.flatMap(findTestFiles);

if (testFiles.length === 0) {
  console.error('No test files discovered!');
  process.exit(1);
}

console.log(`Discovered ${testFiles.length} test files:`);
testFiles.forEach((file) => console.log(` - ${file}`));

const tsxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['tsx', '--test', ...testFiles];

const result = spawnSync(tsxCmd, args, {
  stdio: 'inherit',
  shell: true,
  cwd: ROOT_DIR,
});

process.exit(result.status ?? 0);
