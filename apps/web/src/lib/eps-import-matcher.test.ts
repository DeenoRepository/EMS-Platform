import { before, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';

const equipmentFindManyResults: unknown[][] = [];
mock.module('@ems/database', {
  namedExports: {
    prisma: {
      equipment: { findMany: async () => equipmentFindManyResults.shift() ?? [] },
      customFieldDefinition: { findMany: async () => [] },
      customSection: { findMany: async () => [] },
    },
  },
});

let mapFileHeaders: typeof import('./eps-import-matcher').mapFileHeaders;
let validateEquipmentCollisions: typeof import('./eps-import-matcher').validateEquipmentCollisions;

before(async () => {
  const matcherModule = await import('./eps-import-matcher');
  mapFileHeaders = matcherModule.mapFileHeaders;
  validateEquipmentCollisions = matcherModule.validateEquipmentCollisions;
});

describe('eps-import-matcher real implementation', () => {
  test('maps exact base fields, existing custom fields, and reports unknown fields', () => {
    const result = mapFileHeaders(
      ['Наименование', 'Температура', 'Неизвестный параметр [бар]'],
      [{ Наименование: 'Pump', Температура: 20, 'Неизвестный параметр [бар]': 5 }],
      [{ id: 'f1', key: 'temperature', name: 'Температура', unit: null }],
      [{ id: 's1', code: 'general', name: 'Общие сведения' }],
    );
    assert.equal(result.mappedColumns['Наименование'], 'name');
    assert.equal(result.mappedColumns['Температура'], 'custom_temperature');
    assert.equal(result.missingFields.length, 1);
    assert.equal(result.missingFields[0].suggestedUnit, 'бар');
  });

  test('classifies missing name, inventory collision, serial collision, and new rows', async () => {
    equipmentFindManyResults.push(
      [{ id: 'e1', name: 'Existing Inv', inventoryNumber: 'INV-1', status: 'ACTIVE' }],
      [{ id: 'e2', name: 'Existing SN', serialNumber: 'SN-2', status: 'ACTIVE' }],
    );
    const result = await validateEquipmentCollisions(
      [
        { Name: '', Inv: '', Serial: '' },
        { Name: 'A', Inv: 'INV-1', Serial: '' },
        { Name: 'B', Inv: '', Serial: 'SN-2' },
        { Name: 'C', Inv: 'INV-3', Serial: 'SN-3' },
      ],
      { Name: 'name', Inv: 'inventoryNumber', Serial: 'serialNumber' },
    );
    assert.deepEqual(result.validatedRows.map((row) => row.status), ['ERROR', 'COLLISION', 'COLLISION', 'NEW']);
    assert.deepEqual([result.errorCount, result.collisionCount, result.newCount], [1, 2, 1]);
  });
});
