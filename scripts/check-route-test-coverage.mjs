import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

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

function findFiles(dir, predicate, result = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return result;
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
      if (!EXCLUDED_DIRS.has(entry)) findFiles(filePath, predicate, result);
    } else if (predicate(entry)) {
      result.push(filePath);
    }
  }
  return result;
}

function repositoryRoutes() {
  return findFiles('apps/web/src/app/api', (entry) => entry === 'route.ts')
    .map((filePath) => path.relative('apps/web/src/app/api', path.dirname(filePath)).replaceAll(path.sep, '/'))
    .sort();
}

function importedRoutes() {
  const testFiles = findFiles('apps/web/src', (entry) => entry.endsWith('.test.ts'));
  const routePattern = /@\/app\/api\/(.+?)\/route(?:['"`])/g;
  const routes = new Set();

  for (const testFile of testFiles) {
    const source = readFileSync(testFile, 'utf8');
    for (const match of source.matchAll(routePattern)) routes.add(match[1]);
  }

  return [...routes].sort();
}

const routes = repositoryRoutes();
const tested = importedRoutes();
const testedSet = new Set(tested);
const missing = routes.filter((route) => !testedSet.has(route));
const stale = tested.filter((route) => !routes.includes(route));

console.log(`[route-test-coverage] Production API routes: ${routes.length}`);
console.log(`[route-test-coverage] Routes imported by tests: ${tested.length}`);

if (missing.length > 0) {
  console.error('[route-test-coverage] Missing executable test imports:');
  for (const route of missing) console.error(`  ${route}`);
}

if (stale.length > 0) {
  console.error('[route-test-coverage] Test imports without a production route:');
  for (const route of stale) console.error(`  ${route}`);
}

if (missing.length > 0 || stale.length > 0) {
  process.exitCode = 1;
} else {
  console.log('[route-test-coverage] PASS: every production API route has an executable test import.');
}
