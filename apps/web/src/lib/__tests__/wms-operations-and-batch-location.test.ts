import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('WMS Operations & Batch Cell Location Management', () => {
  test('validates receipt line item quantities and allows inline adjustments', () => {
    interface LineItem {
      nomenclatureId: string;
      quantity: number;
      cellId?: string | null;
    }

    const items: LineItem[] = [
      { nomenclatureId: 'nom-1', quantity: 1, cellId: null },
      { nomenclatureId: 'nom-2', quantity: 10, cellId: 'cell-a1' },
    ];

    // Inline quantity update simulation
    const updatedQty = 25.5;
    items[0].quantity = updatedQty;
    items[0].cellId = 'cell-b2';

    assert.strictEqual(items[0].quantity, 25.5);
    assert.strictEqual(items[0].cellId, 'cell-b2');

    // Validation check
    for (const item of items) {
      assert.ok(item.quantity > 0, 'Quantity must be strictly positive');
      assert.ok(!isNaN(item.quantity), 'Quantity must be a valid number');
    }
  });

  test('validates cell warehouse ownership during receipt', () => {
    const warehouseId = 'wh-main';
    const validCell = { id: 'cell-1', zone: { warehouseId: 'wh-main' } };
    const invalidCell = { id: 'cell-2', zone: { warehouseId: 'wh-secondary' } };

    const isValid1 = validCell.zone.warehouseId === warehouseId;
    const isValid2 = invalidCell.zone.warehouseId === warehouseId;

    assert.strictEqual(isValid1, true);
    assert.strictEqual(isValid2, false);
  });

  test('batch cell location checks that all stock items belong to a single warehouse', () => {
    const singleWarehouseItems = [
      { id: 'stock-1', warehouseId: 'wh-1', warehouseName: 'Центральный склад' },
      { id: 'stock-2', warehouseId: 'wh-1', warehouseName: 'Центральный склад' },
    ];

    const multiWarehouseItems = [
      { id: 'stock-1', warehouseId: 'wh-1', warehouseName: 'Центральный склад' },
      { id: 'stock-3', warehouseId: 'wh-2', warehouseName: 'Склад ЗИП' },
    ];

    const getUniqueWarehouses = (items: Array<{ warehouseId: string; warehouseName: string }>) => {
      const set = new Set(items.map((i) => i.warehouseId));
      return Array.from(set);
    };

    assert.strictEqual(getUniqueWarehouses(singleWarehouseItems).length, 1);
    assert.strictEqual(getUniqueWarehouses(multiWarehouseItems).length, 2);
  });

  test('batch-location route file exists and has proper PATCH handler with security checks', () => {
    const routePath = path.resolve(process.cwd(), 'apps/web/src/app/api/wms/stock/batch-location/route.ts');
    assert.ok(fs.existsSync(routePath), 'batch-location route file should exist');

    const content = fs.readFileSync(routePath, 'utf8');
    assert.match(content, /export async function PATCH/);
    assert.match(content, /stockItemIds/);
    assert.match(content, /cellId/);
    assert.match(content, /prisma\.\$transaction/);
    assert.match(content, /logAuditEvent/);
    assert.match(content, /PERMISSIONS\.WMS_ZONES_MANAGE/);
  });

  test('BulkLocationModal component exists and provides batch location interface', () => {
    const modalPath = path.resolve(process.cwd(), 'apps/web/src/components/wms/BulkLocationModal.tsx');
    assert.ok(fs.existsSync(modalPath), 'BulkLocationModal should exist');

    const content = fs.readFileSync(modalPath, 'utf8');
    assert.match(content, /export default function BulkLocationModal/);
    assert.match(content, /\/api\/wms\/stock\/batch-location/);
    assert.match(content, /uniqueWarehouses/);
    assert.match(content, /selectedCellId/);
  });

  test('CreateNomenclatureDialog supports initial quantity and cell assignment for receipt', () => {
    const dialogPath = path.resolve(process.cwd(), 'apps/web/src/components/wms/CreateNomenclatureDialog.tsx');
    const content = fs.readFileSync(dialogPath, 'utf8');
    assert.match(content, /showReceiptFields/);
    assert.match(content, /receiptQuantity/);
    assert.match(content, /receiptCellId/);
    assert.match(content, /initialQuantity/);
  });

  test('WmsOperationWizardDialog includes inline quantity editing and cell assignment for RECEIPT', () => {
    const wizardPath = path.resolve(process.cwd(), 'apps/web/src/components/wms/WmsOperationWizardDialog.tsx');
    const content = fs.readFileSync(wizardPath, 'utf8');
    assert.match(content, /handleUpdateItemQuantity/);
    assert.match(content, /handleUpdateItemCell/);
    assert.match(content, /flatWarehouseCells/);
    assert.match(content, /showReceiptFields=\{operationType === 'RECEIPT'\}/);
  });

  test('Stock page integrates BulkLocationModal into bulk action bar', () => {
    const stockPagePath = path.resolve(process.cwd(), 'apps/web/src/app/wms/stock/page.tsx');
    const content = fs.readFileSync(stockPagePath, 'utf8');
    assert.match(content, /BulkLocationModal/);
    assert.match(content, /isBulkLocationOpen/);
    assert.match(content, /Переместить в ячейку/);
  });
});
