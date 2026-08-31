#!/usr/bin/env node
/** Guard against silently emptying the configured Vitest component suite. */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const MINIMUM_COMPONENT_TEST_FILE_COUNT = 6;
const isWindows = process.platform === 'win32';
const command = isWindows ? process.env.ComSpec || 'cmd.exe' : 'pnpm';
const args = isWindows
  ? ['/d', '/s', '/c', 'pnpm exec vitest list --filesOnly']
  : ['exec', 'vitest', 'list', '--filesOnly'];
const result = spawnSync(command, args, {
  cwd: process.cwd(),
  encoding: 'utf8',
  shell: false,
});

if (result.error || result.status !== 0) {
  process.stderr.write(result.stderr || '');
  console.error(
    '[component-test-discovery] ERROR: Vitest discovery command failed.',
    result.error?.message || '',
  );
  process.exit(1);
}

const testFiles = (result.stdout || '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.endsWith('.test.tsx'));

console.log(`[component-test-discovery] Vitest matched ${testFiles.length} *.test.tsx file(s).`);
if (testFiles.length < MINIMUM_COMPONENT_TEST_FILE_COUNT) {
  console.error(
    `[component-test-discovery] ERROR: expected at least ${MINIMUM_COMPONENT_TEST_FILE_COUNT} ` +
      `configured component test files, but Vitest matched ${testFiles.length}.`,
  );
  process.exit(1);
}
