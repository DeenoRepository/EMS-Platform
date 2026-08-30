import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { escapeHtml } from '../../components/wms/inventory-count-sheet-print';

describe('inventory count sheet printable HTML escaping', () => {
  test('escapes HTML and attribute-sensitive characters', () => {
    const payload = '<script>alert(1)</script><img src="x" onerror="alert(1)">&';
    const escaped = escapeHtml(payload);

    assert.ok(escaped.includes('&' + 'lt;script' + '&' + 'gt;'));
    assert.ok(escaped.includes('&' + 'lt;img src=' + '&' + 'quot;x' + '&' + 'quot; onerror=' + '&' + 'quot;alert(1)' + '&' + 'quot;' + '&' + 'gt;'));
    assert.ok(escaped.endsWith('&' + 'amp;'));
    assert.doesNotMatch(escaped, /<script|<img|onerror\s*=\s*['"]?alert/i);
  });

  test('escapes apostrophes', () => {
    const value = String.fromCharCode(105, 116, 39, 115, 32, 117, 110, 115, 97, 102, 101);
    assert.equal(escapeHtml(value), 'it' + String.fromCharCode(38, 35, 51, 57, 59) + 's unsafe');
  });

  test('converts nullish values to an empty string', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
  });

  test('preserves ordinary printable text and numbers', () => {
    assert.equal(escapeHtml('Подшипник А-42'), 'Подшипник А-42');
    assert.equal(escapeHtml(12.5), '12.5');
  });
});
