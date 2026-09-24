import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildEquipmentWhereInput } from '../eps-query-builder';

describe('EPS Query Builder (Where input construction)', () => {
  it('builds deletedAt: null by default', () => {
    const params = new URLSearchParams();
    const where = buildEquipmentWhereInput(params);
    assert.strictEqual(where.deletedAt, null);
    assert.strictEqual(where.AND, undefined);
  });

  it('adds search OR condition across key text fields', () => {
    const params = new URLSearchParams({ search: 'вакуум' });
    const where = buildEquipmentWhereInput(params);
    assert.ok(where.AND);
    assert.strictEqual(where.AND.length, 1);
    const searchCond = (where.AND[0] as any).OR;
    assert.ok(Array.isArray(searchCond));
    assert.strictEqual(searchCond.length, 6);
  });

  it('adds specific text column filters', () => {
    const params = new URLSearchParams({
      inventoryNumber: 'ИНВ-001',
      name: 'Пресс',
      serialNumber: 'SN-100',
      manufacturer: 'Kuka',
      model: 'KR 16',
      location: 'Сектор А',
    });
    const where = buildEquipmentWhereInput(params);
    assert.ok(where.AND);
    assert.strictEqual(where.AND.length, 6);
  });

  it('adds status, tag, and document relations filters', () => {
    const params = new URLSearchParams({
      status: 'ACTIVE',
      tagId: 'tag-123',
      documentsFilter: 'with',
      sparePartsFilter: 'without',
    });
    const where = buildEquipmentWhereInput(params);
    assert.ok(where.AND);
    assert.strictEqual(where.AND.length, 4);
    assert.deepStrictEqual(where.AND[0], { status: 'ACTIVE' });
    assert.deepStrictEqual(where.AND[1], { tags: { some: { tagId: 'tag-123' } } });
    assert.deepStrictEqual(where.AND[2], { documents: { some: {} } });
    assert.deepStrictEqual(where.AND[3], { spareParts: { none: {} } });
  });

  it('adds date range filters with proper boundaries', () => {
    const params = new URLSearchParams({
      commissionDateFrom: '2024-01-01',
      commissionDateTo: '2024-12-31',
    });
    const where = buildEquipmentWhereInput(params);
    assert.ok(where.AND);
    assert.strictEqual(where.AND.length, 1);
    const dateRange = (where.AND[0] as any).commissionDate;
    assert.ok(dateRange.gte instanceof Date);
    assert.ok(dateRange.lte instanceof Date);
  });

  it('adds custom JSON fields and boolean classifiers', () => {
    const params = new URLSearchParams({
      criticality: 'A',
      cleanRoom: 'ISO 5',
      respPerson: 'Иванов',
      isCriticalPath: 'true',
      isUnique: 'false',
    });
    const where = buildEquipmentWhereInput(params);
    assert.ok(where.AND);
    assert.strictEqual(where.AND.length, 5);
  });
});
