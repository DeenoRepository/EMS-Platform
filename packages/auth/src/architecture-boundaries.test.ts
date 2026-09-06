import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('Architecture Boundary & Dependency Enforcement Suite', () => {
  const PACKAGES_DIR = join(process.cwd(), 'packages');

  function getTsFiles(dir: string): string[] {
    let files: string[] = [];
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.turbo') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        files = files.concat(getTsFiles(full));
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        files.push(full);
      }
    }
    return files;
  }

  const allPackageFiles = getTsFiles(PACKAGES_DIR);

  test('Packages must NEVER import from apps/web (one-way dependency constraint)', () => {
    const violations: { file: string; line: string }[] = [];

    for (const file of allPackageFiles) {
      // Exclude this test file itself
      if (file.endsWith('architecture-boundaries.test.ts')) continue;

      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line: string, idx: number) => {
        if (
          (line.includes('from ') || line.includes('import(')) &&
          (line.includes('@/app') ||
            line.includes('@/components') ||
            line.includes('@/lib') ||
            line.includes('/apps/web') ||
            line.includes('../../../apps/web'))
        ) {
          violations.push({ file, line: `Line ${idx + 1}: ${line.trim()}` });
        }
      });
    }

    assert.deepStrictEqual(
      violations,
      [],
      `Found forbidden imports of apps/web from within packages:\n${violations.map((v) => `${v.file}: ${v.line}`).join('\n')}`
    );
  });

  test('Domain packages must not import retired prototype services (jira-service, srm-providers)', () => {
    const violations: { file: string; line: string }[] = [];

    for (const file of allPackageFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line: string, idx: number) => {
        if (
          (line.includes('from ') || line.includes('import(')) &&
          (line.includes('jira-service') || line.includes('srm-providers'))
        ) {
          violations.push({ file, line: `Line ${idx + 1}: ${line.trim()}` });
        }
      });
    }

    assert.deepStrictEqual(
      violations,
      [],
      `Found forbidden imports of retired SRM services:\n${violations.map((v) => `${v.file}: ${v.line}`).join('\n')}`
    );
  });

  test('EPS package must not deep-import internal files of WMS (must use public API)', () => {
    const epsDir = join(PACKAGES_DIR, 'eps');
    const epsFiles = getTsFiles(epsDir);
    const deepImports: string[] = [];

    for (const file of epsFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line: string) => {
        if (
          (line.includes('from ') || line.includes('import(')) &&
          line.includes('@ems/wms/src/')
        ) {
          deepImports.push(`${file}: ${line.trim()}`);
        }
      });
    }

    assert.deepStrictEqual(deepImports, [], 'EPS package has forbidden deep imports into @ems/wms internals');
  });

  test('WMS package must not deep-import internal files of EPS (must use public API)', () => {
    const wmsDir = join(PACKAGES_DIR, 'wms');
    const wmsFiles = getTsFiles(wmsDir);
    const deepImports: string[] = [];

    for (const file of wmsFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line: string) => {
        if (
          (line.includes('from ') || line.includes('import(')) &&
          line.includes('@ems/eps/src/')
        ) {
          deepImports.push(`${file}: ${line.trim()}`);
        }
      });
    }

    assert.deepStrictEqual(deepImports, [], 'WMS package has forbidden deep imports into @ems/eps internals');
  });
});
