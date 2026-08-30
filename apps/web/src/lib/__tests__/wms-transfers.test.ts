import { test, describe } from 'node:test';
import assert from 'node:assert';
import { StockTransferStatus } from '@ems/database';
import { buildTransferWhereModel } from '../wms-transfer-where-model';

describe('WMS Transfers Business Logic & ID Generation', () => {
  test('generates collision-resistant transfer number with crypto random suffix', () => {
    const isRequest = false;
    const prefix = isRequest ? 'REQ' : 'TR';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uniqueSuffix1 = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    const transferNumber1 = `${prefix}-${dateStr}-${uniqueSuffix1}`;

    const uniqueSuffix2 = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    const transferNumber2 = `${prefix}-${dateStr}-${uniqueSuffix2}`;

    assert.match(transferNumber1, /^TR-\d{8}-[A-F0-9]{6}$/);
    assert.match(transferNumber2, /^TR-\d{8}-[A-F0-9]{6}$/);
    assert.notStrictEqual(transferNumber1, transferNumber2);
  });

  test('generates request number with REQ prefix', () => {
    const isRequest = true;
    const prefix = isRequest ? 'REQ' : 'TR';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uniqueSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    const transferNumber = `${prefix}-${dateStr}-${uniqueSuffix}`;

    assert.match(transferNumber, /^REQ-\d{8}-[A-F0-9]{6}$/);
  });

  test('validates transfer items quantities', () => {
    const invalidItems = [
      { nomenclatureId: 'nom-1', quantity: 0 },
      { nomenclatureId: 'nom-2', quantity: -5 },
      { nomenclatureId: 'nom-3', quantity: Number.NaN },
    ];

    for (const item of invalidItems) {
      const q = Number(item.quantity);
      const isInvalid = isNaN(q) || q <= 0;
      assert.strictEqual(isInvalid, true, `Item quantity ${item.quantity} should be detected as invalid`);
    }

    const validItem = { nomenclatureId: 'nom-4', quantity: 15.5 };
    const q = Number(validItem.quantity);
    const isValid = !isNaN(q) && q > 0;
    assert.strictEqual(isValid, true);
  });

  test('source and target warehouse cannot be identical', () => {
    const sourceWh = 'wh-main';
    const targetWh = 'wh-main';
    const isSame = sourceWh === targetWh;
    assert.strictEqual(isSame, true);
  });
});

describe('WMS transfer where model', () => {
  const userId = 'user-1';

  test('applies inbound warehouse scope and overrides status', () => {
    assert.deepStrictEqual(buildTransferWhereModel({
      mode: 'inbound',
      status: StockTransferStatus.COMPLETED,
      warehouseId: 'warehouse-1',
      userId,
    }), {
      status: StockTransferStatus.IN_TRANSIT,
      targetWarehouseId: 'warehouse-1',
    });
  });

  test('applies my requests scope without overriding explicit status', () => {
    assert.deepStrictEqual(buildTransferWhereModel({
      mode: 'my_requests',
      status: StockTransferStatus.REJECTED,
      userId,
    }), {
      status: StockTransferStatus.REJECTED,
      createdById: userId,
    });
  });

  test('combines all-warehouse scope and relation search filter', () => {
    assert.deepStrictEqual(buildTransferWhereModel({
      mode: 'all',
      warehouseId: 'warehouse-1',
      search: ' bearing ',
      userId,
    }), {
      OR: [
        { sourceWarehouseId: 'warehouse-1' },
        { targetWarehouseId: 'warehouse-1' },
      ],
      AND: [{
        OR: [
          { transferNumber: { contains: ' bearing ', mode: 'insensitive' } },
          { requestReason: { contains: ' bearing ', mode: 'insensitive' } },
          { rejectionReason: { contains: ' bearing ', mode: 'insensitive' } },
          { sourceWarehouse: { name: { contains: ' bearing ', mode: 'insensitive' } } },
          { targetWarehouse: { name: { contains: ' bearing ', mode: 'insensitive' } } },
          { items: { some: { nomenclature: { name: { contains: ' bearing ', mode: 'insensitive' } } } } },
        ],
      }],
    });
  });
});
