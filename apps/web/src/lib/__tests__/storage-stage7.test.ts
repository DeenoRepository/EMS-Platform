import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAbsoluteFilePath } from '../storage';

test('storage rejects paths outside the upload root', () => {
  assert.throws(() => getAbsoluteFilePath('../outside.txt'), /Недопустимый путь/);
});
