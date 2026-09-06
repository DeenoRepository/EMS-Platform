import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// A source-level retirement guard, not a substitute for browser interaction tests.
test('EPS passport retains incident history without retired prototype actions', () => {
  const page = readFileSync(resolve('apps/web/src/app/eps/[id]/page.tsx'), 'utf8');
  assert.doesNotMatch(page, /setOpenCreateSrmModal|CreateServiceRequestDialog|createSchedule/);
  assert.doesNotMatch(page, /router\.push\([`'"]\/(?:srm|mro)/);
  assert.match(page, /equipment\.jiraIssues\.map/);
  assert.match(page, /formatDateTime\(issue\.resolvedDate\)/);
  assert.match(page, /Исторические записи доступны только для чтения/);
});
