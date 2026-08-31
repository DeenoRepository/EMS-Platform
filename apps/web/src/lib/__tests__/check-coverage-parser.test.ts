/**
 * Regression tests for parseCoverageOutput() in scripts/check-coverage.mjs.
 *
 * Node 22 reports flat file paths. Node 24 reports an indented path tree.
 * The old parser retained only leaf basenames, so duplicate names such as
 * route.ts collapsed into one Set entry. These fixtures verify both shapes,
 * full-path reconstruction, duplicate-basename retention, and exact header
 * filtering. The synthetic tree uses the supported TAP diagnostic marker '#'
 * so the fixture remains stable under Windows output capture.
 */
import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

type ParseCoverageOutput = (rawOutput: string) => {
  lineCoverageAmongLoaded: number | null;
  coveredFiles: Set<string>;
};

let parseCoverageOutput: ParseCoverageOutput;

/** Builds one Node 24-style tree row; depth 0 is a top-level path segment. */
function treeRow(depth: number, name: string, linePct?: number): string {
  const indent = ' '.repeat(depth + 1);
  const lineCell = linePct === undefined ? '' : linePct.toFixed(2);
  return `#${indent}${name.padEnd(30)} | ${lineCell.padStart(6)} |          |         |`;
}

describe('check-coverage.mjs parseCoverageOutput()', () => {
  before(async () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const modulePath = path.resolve(here, '../../../../../scripts/check-coverage.mjs');
    const coverageModule = await import(pathToFileURL(modulePath).href);
    parseCoverageOutput = coverageModule.parseCoverageOutput;
  });

  test('parses the Node 22 flat-path table shape', () => {
    const fixture = [
      '# file | line % | branch % | funcs % | uncovered lines',
      '# all files | 80.25 | 70.00 | 75.00 |',
      '# apps/web/src/lib/foo.ts | 85.71 | 80.00 | 100.00 | 12-13',
      '# packages/auth/src/rbac.ts | 100.00 | 100.00 | 100.00 |',
      '# apps/web/src/lib/file-access.ts | 42.00 | 30.00 | 50.00 | 5-9',
    ].join('\n');

    const { lineCoverageAmongLoaded, coveredFiles } = parseCoverageOutput(fixture);

    assert.equal(lineCoverageAmongLoaded, 80.25);
    assert.deepEqual(
      [...coveredFiles].sort(),
      [
        'apps/web/src/lib/file-access.ts',
        'apps/web/src/lib/foo.ts',
        'packages/auth/src/rbac.ts',
      ],
    );
  });

  test('reconstructs distinct full paths from the Node 24 tree shape', () => {
    const fixture = [
      '# file | line % | branch % | funcs % | uncovered lines',
      '# all files | 67.28 | 60.00 | 55.00 |',
      treeRow(0, 'apps'),
      treeRow(1, 'web'),
      treeRow(2, 'src'),
      treeRow(3, 'app'),
      treeRow(4, 'api'),
      treeRow(5, 'wms'),
      treeRow(6, 'transfers'),
      treeRow(7, 'route.ts', 31.02),
      treeRow(6, 'operations'),
      treeRow(7, 'route.ts', 55.10),
      treeRow(0, 'packages'),
      treeRow(1, 'auth'),
      treeRow(2, 'src'),
      treeRow(3, 'index.ts', 100),
    ].join('\n');

    const { lineCoverageAmongLoaded, coveredFiles } = parseCoverageOutput(fixture);

    assert.equal(lineCoverageAmongLoaded, 67.28);
    assert.deepEqual(
      [...coveredFiles].sort(),
      [
        'apps/web/src/app/api/wms/operations/route.ts',
        'apps/web/src/app/api/wms/transfers/route.ts',
        'packages/auth/src/index.ts',
      ],
    );
  });

  test('excludes exact header and total rows from coveredFiles', () => {
    const fixture = [
      '# file | line % |',
      '# all files | 50.00 |',
      '# apps/web/src/lib/x.ts | 50.00 |',
    ].join('\n');

    const { coveredFiles } = parseCoverageOutput(fixture);

    assert.deepEqual([...coveredFiles], ['apps/web/src/lib/x.ts']);
  });

  test('returns null when the all-files total row is absent', () => {
    const result = parseCoverageOutput('no coverage output here\n');
    assert.equal(result.lineCoverageAmongLoaded, null);
    assert.equal(result.coveredFiles.size, 0);
  });

  test('does not count directory rows as covered files', () => {
    const fixture = [
      '# all files | 90.00 |',
      treeRow(0, 'apps'),
      treeRow(1, 'foo.ts', 90),
    ].join('\n');

    const { coveredFiles } = parseCoverageOutput(fixture);

    assert.deepEqual([...coveredFiles], ['apps/foo.ts']);
  });
});
