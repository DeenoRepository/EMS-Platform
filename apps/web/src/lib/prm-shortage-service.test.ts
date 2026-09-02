import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateShortageSuggestions, type ShortageStockRow } from './prm-shortage-service';

function row(overrides: Partial<ShortageStockRow> = {}): ShortageStockRow {
  return {
    id: 'stock-1',
    warehouseId: 'warehouse-1',
    nomenclatureId: 'nom-1',
    quantity: 3,
    nomenclature: {
      id: 'nom-1',
      name: 'Bearing',
      article: 'B-1',
      unit: 'pcs',
      minStock: 5,
      deletedAt: null,
    },
    warehouse: { id: 'warehouse-1', name: 'Main', code: 'MAIN' },
    ...overrides,
  };
}

describe('PRM shortage service', () => {
  test('suggests a position strictly when quantity is below minStock', () => {
    const suggestions = calculateShortageSuggestions([row()]);
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].shortageQty, 2);
  });

  test('does not suggest a position when quantity equals minStock', () => {
    const suggestions = calculateShortageSuggestions([row({ quantity: 5 })]);
    assert.equal(suggestions.length, 0);
  });

  test('does not suggest a position when quantity is above minStock', () => {
    const suggestions = calculateShortageSuggestions([row({ quantity: 6 })]);
    assert.equal(suggestions.length, 0);
  });

  test('excludes nomenclature with deletedAt', () => {
    const suggestions = calculateShortageSuggestions([
      row({ nomenclature: { ...row().nomenclature, deletedAt: new Date('2026-01-01') } }),
    ]);
    assert.equal(suggestions.length, 0);
  });

  test('excludes null minStock', () => {
    const suggestions = calculateShortageSuggestions([
      row({ nomenclature: { ...row().nomenclature, minStock: null } }),
    ]);
    assert.equal(suggestions.length, 0);
  });

  test('supports Decimal-like string values at the API boundary', () => {
    const suggestions = calculateShortageSuggestions([
      row({ quantity: '1.5', nomenclature: { ...row().nomenclature, minStock: '4.5' } }),
    ]);
    assert.equal(suggestions[0].quantity, 1.5);
    assert.equal(suggestions[0].minStock, 4.5);
    assert.equal(suggestions[0].shortageQty, 3);
  });
});
