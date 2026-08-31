import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { makeEnglishSlug, normalizeHeader, KNOWN_BASE_FIELDS } from './eps-import-helpers';

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

// ─── normalizeHeader (real production function) ────────────────────────────
// Migrated from packages/auth/src/eps-import.test.ts (M4 tautological cleanup).
// The local copy in that file used a different regex — it only stripped
// [*[]()], while the production version also strips /,\- and replaces with
// a space rather than empty string. These tests now run against the real impl.
describe('normalizeHeader — production normalization rules', () => {
  test('lowercases the input', () => {
    assert.equal(normalizeHeader('Наименование'), 'наименование');
  });

  test('replaces special chars (*, [, ], (, ), /, ,, \\, -) with a space and trims', () => {
    // production regex: /[*[\]()/,\\-]/g → replaced with space, then trimmed
    assert.equal(normalizeHeader('Инвентарный № [обязательно]'), 'инвентарный № обязательно');
    assert.equal(normalizeHeader('Место установки (Цех/участок)'), 'место установки цех участок');
    assert.equal(normalizeHeader('Завод-изготовитель'), 'завод изготовитель');
  });

  test('collapses multiple whitespace runs into one space', () => {
    assert.equal(normalizeHeader('Наименование  оборудования'), 'наименование оборудования');
  });

  test('trims leading and trailing whitespace', () => {
    assert.equal(normalizeHeader('  название  '), 'название');
  });

  test('normalizeHeader is idempotent: running it twice gives the same result', () => {
    // Normalizing an already-normalized string must be stable.
    // Note: KNOWN_BASE_FIELDS aliases may contain "/" (e.g. "заводской / серийный номер")
    // which is intentional — they are matched against the normalized header, not stored pre-normalized.
    for (const rule of KNOWN_BASE_FIELDS) {
      for (const alias of rule.aliases) {
        const once = normalizeHeader(alias);
        const twice = normalizeHeader(once);
        assert.equal(
          once,
          twice,
          `normalizeHeader is not idempotent for alias "${alias}" in rule "${rule.targetKey}"`,
        );
      }
    }
  });
});
