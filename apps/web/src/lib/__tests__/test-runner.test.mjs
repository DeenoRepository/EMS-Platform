import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { childExitCode, findTestFiles } from '../../../../../scripts/run-all-tests.mjs';

test('runner propagates failure, signals and spawn errors', () => {
  assert.equal(childExitCode({ status: 0 }), 0);
  assert.equal(childExitCode({ status: 7 }), 7);
  assert.equal(childExitCode({ status: null, error: new Error('spawn failed') }), 1);
  assert.equal(childExitCode({ status: null, signal: 'SIGTERM' }), 1);
  assert.equal(childExitCode({ status: null }), 1);
});

test('discovery includes supported extensions and limits exclusions to exact paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'ems-runner-'));
  try {
    mkdirSync(join(root, 'tests', 'nested'), { recursive: true });
    mkdirSync(join(root, 'tests', 'node_modules'));
    for (const extension of ['ts', 'tsx', 'js', 'mjs', 'cjs']) {
      writeFileSync(join(root, 'tests', `example.test.${extension}`), '');
    }
    writeFileSync(join(root, 'tests', 'login.test.ts'), '');
    writeFileSync(join(root, 'tests', 'nested', 'login.test.ts'), '');
    writeFileSync(join(root, 'tests', 'node_modules', 'ignored.test.ts'), '');
    const found = findTestFiles(root, 'tests', new Set(['tests/login.test.ts']));
    assert.equal(found.length, 6);
    assert.ok(found.includes('tests/nested/login.test.ts'));
    assert.ok(!found.some((path) => path.includes('node_modules')));
    assert.throws(() => findTestFiles(root, 'missing'), { code: 'ENOENT' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
