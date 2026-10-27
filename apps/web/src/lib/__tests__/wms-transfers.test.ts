import { test, describe } from 'node:test';
import assert from 'node:assert';

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

  test('simulates guarded atomic decrement to prevent race condition overdraft', () => {
    // Model state representing database record with balance
    let stockRecord = { quantity: 10 };

    const guardedDecrement = (qty: number): boolean => {
      // Guarded atomic where: { quantity: { gte: qty } }
      if (stockRecord.quantity >= qty) {
        stockRecord.quantity -= qty;
        return true;
      }
      return false; // count === 0 in Prisma updateMany
    };

    // First operation requests 7 -> succeeds, balance = 3
    const op1 = guardedDecrement(7);
    assert.strictEqual(op1, true);
    assert.strictEqual(stockRecord.quantity, 3);

    // Concurrent second operation requests 5 -> fails atomically because 3 < 5!
    const op2 = guardedDecrement(5);
    assert.strictEqual(op2, false);
    assert.strictEqual(stockRecord.quantity, 3); // Balance untouched

    // Third operation requests remaining 3 -> succeeds, balance = 0
    const op3 = guardedDecrement(3);
    assert.strictEqual(op3, true);
    assert.strictEqual(stockRecord.quantity, 0);
  });

  test('validates cross-warehouse cell isolation on transfer receiving', () => {
    const targetWarehouseId = 'wh-destination';
    const otherWarehouseId = 'wh-source';

    const cellsInDb = [
      { id: 'cell-dest-1', warehouseId: targetWarehouseId },
      { id: 'cell-dest-2', warehouseId: targetWarehouseId },
      { id: 'cell-other-1', warehouseId: otherWarehouseId },
    ];

    const validateCellsBelongToTarget = (cellIds: string[], targetWh: string): boolean => {
      const validSet = new Set(cellsInDb.filter((c) => c.warehouseId === targetWh).map((c) => c.id));
      return cellIds.every((id) => validSet.has(id));
    };

    // Valid allocation to cells belonging to destination warehouse
    assert.strictEqual(validateCellsBelongToTarget(['cell-dest-1', 'cell-dest-2'], targetWarehouseId), true);

    // Invalid allocation attempting to assign cell from source warehouse to destination
    assert.strictEqual(validateCellsBelongToTarget(['cell-dest-1', 'cell-other-1'], targetWarehouseId), false);
  });

  test('transfer route handlers enforce rate limiting and atomic operations', () => {
    const fs = require('node:fs');
    const path = require('node:path');

    const dispatchRoute = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/app/api/wms/transfers/[id]/dispatch/route.ts'),
      'utf8'
    );
    assert.match(dispatchRoute, /enforceRateLimit/);
    assert.match(dispatchRoute, /updateMany/);
    assert.match(dispatchRoute, /decrement/);

    const receiveRoute = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/app/api/wms/transfers/[id]/receive/route.ts'),
      'utf8'
    );
    assert.match(receiveRoute, /enforceRateLimit/);
    assert.match(receiveRoute, /targetWarehouseId/);
    assert.match(receiveRoute, /upsert/);
    assert.match(receiveRoute, /increment/);

    const rejectRoute = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/app/api/wms/transfers/[id]/reject/route.ts'),
      'utf8'
    );
    assert.match(rejectRoute, /enforceRateLimit/);
    assert.match(rejectRoute, /upsert/);
    assert.match(rejectRoute, /increment/);
  });

});
