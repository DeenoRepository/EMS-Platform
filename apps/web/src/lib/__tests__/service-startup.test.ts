import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The repository test runner executes from the workspace root.
// This checks the shipped unit, not a simulated startup implementation.
test('systemd unit only executes the application, without database lifecycle hooks', () => {
  const unit = readFileSync(resolve('scripts/ems-platform.service'), 'utf8');
  const directives = unit.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^Exec\w*\s*=/.test(line));

  assert.deepEqual(directives, [
    'ExecStart=/opt/ems-platform/apps/web/node_modules/.bin/next start /opt/ems-platform/apps/web -p 3000',
  ], 'Startup must not run schema synchronization, migrations, seed, or lifecycle shell wrappers');
});
