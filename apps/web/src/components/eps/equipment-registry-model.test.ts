import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getEquipmentSortValue, sortEquipmentRegistry } from './equipment-registry-model';

const items = [
  { id: '1', name: 'Бета', inventoryNumber: '2', serialNumber: null, manufacturer: null, model: null, location: null, status: 'ACTIVE', commissionDate: null, primaryPhoto: null, tags: [{ id: 't', name: 'Z', color: null }], counts: { documents: 1, photos: 0, maintenancePlans: 0, spareParts: 3 }, createdAt: '2026-01-01', updatedAt: '2026-01-02', customFields: { actual_wear_percentage: 20, is_unique: true } },
  { id: '2', name: 'Альфа', inventoryNumber: '1', serialNumber: null, manufacturer: null, model: null, location: null, status: 'DRAFT', commissionDate: null, primaryPhoto: null, tags: [], counts: { documents: 0, photos: 0, maintenancePlans: 0, spareParts: 1 }, createdAt: '2026-01-01', updatedAt: '2026-01-03', customFields: { actual_wear_percentage: 80, is_unique: false } },
];

describe('equipment registry model', () => {
  test('extracts direct, custom, boolean, count, and date sort values', () => {
    assert.equal(getEquipmentSortValue(items[0], 'name'), 'Бета');
    assert.equal(getEquipmentSortValue(items[0], 'actualWear'), 20);
    assert.equal(getEquipmentSortValue(items[0], 'isUnique'), 1);
    assert.equal(getEquipmentSortValue(items[0], 'sparePartsCount'), 3);
    assert.equal(typeof getEquipmentSortValue(items[0], 'createdAt'), 'number');
  });

  test('sorts without mutating input and returns input for empty field', () => {
    const sorted = sortEquipmentRegistry(items, 'name', 'asc');
    assert.deepEqual(sorted.map((item) => item.name), ['Альфа', 'Бета']);
    assert.notEqual(sorted, items);
    assert.equal(sortEquipmentRegistry(items, '', 'asc'), items);
  });
});
