/**
 * storage.test.ts — real-import tests for ALLOWED_EXTENSIONS whitelist.
 *
 * Migrated from packages/auth/src/eps-import.test.ts (M4 tautological cleanup).
 * The previous test file declared local sets of extensions instead of importing
 * the production constant — this file imports the real ALLOWED_EXTENSIONS from
 * storage.ts and tests its current values directly.
 */
import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ALLOWED_EXTENSIONS } from '../storage';

describe('storage — ALLOWED_EXTENSIONS whitelist', () => {
  describe('documents', () => {
    const docs = ALLOWED_EXTENSIONS.documents;

    test('allows engineering drawing formats (.dwg, .dxf)', () => {
      assert.ok(docs.has('.dwg'));
      assert.ok(docs.has('.dxf'));
    });

    test('allows common office document formats', () => {
      assert.ok(docs.has('.pdf'));
      assert.ok(docs.has('.doc'));
      assert.ok(docs.has('.docx'));
      assert.ok(docs.has('.xls'));
      assert.ok(docs.has('.xlsx'));
      assert.ok(docs.has('.csv'));
    });

    test('rejects executable and dangerous extensions', () => {
      assert.ok(!docs.has('.exe'));
      assert.ok(!docs.has('.sh'));
      assert.ok(!docs.has('.php'));
      assert.ok(!docs.has('.bat'));
      assert.ok(!docs.has('.js'));
    });
  });

  describe('photos', () => {
    const photos = ALLOWED_EXTENSIONS.photos;

    test('allows web image formats', () => {
      assert.ok(photos.has('.jpg'));
      assert.ok(photos.has('.jpeg'));
      assert.ok(photos.has('.png'));
      assert.ok(photos.has('.webp'));
    });

    test('rejects document formats in photo slot', () => {
      assert.ok(!photos.has('.pdf'));
      assert.ok(!photos.has('.docx'));
      assert.ok(!photos.has('.dwg'));
    });

    test('rejects executable extensions', () => {
      assert.ok(!photos.has('.exe'));
      assert.ok(!photos.has('.php'));
      assert.ok(!photos.has('.sh'));
    });
  });
});
