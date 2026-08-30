import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeEnglishSlug } from './eps-import-helpers';

test('returns canonical key for an exact known field header', () => {
  assert.equal(makeEnglishSlug('Рабочее напряжение'), 'operating_voltage');
});

test('returns canonical key for a matching phrase in a longer header', () => {
  assert.equal(makeEnglishSlug('Фактический процент износа [ % ]'), 'actual_wear_percentage');
});

test('translates known Russian words and transliterates unknown words', () => {
  assert.equal(makeEnglishSlug('Производитель агрегата'), 'manufacturer_agregata');
});

test('sanitizes punctuation and repeated separators', () => {
  assert.equal(makeEnglishSlug('custom / field (A)'), 'custom_field_a');
});

test('uses the custom field fallback when no slug characters remain', () => {
  const slug = makeEnglishSlug('!!!');
  assert.match(slug, /^custom_field_[0-9a-f]{8}$/);
});
