import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addOrMergeLineItem,
  buildTransferRequestPayload,
  resolveInitialWarehouseSelection,
  validateTransferRequest,
} from './transfer-request-submit';

describe('transfer request submit helpers', () => {
  const warehouses = [
    { id: 'wh-1', name: 'Main', code: 'MAIN', responsibleUserId: 'user-1' },
    { id: 'wh-2', name: 'Reserve', code: 'RES' },
  ];

  test('selects the current user warehouse as destination and another as donor', () => {
    assert.deepEqual(resolveInitialWarehouseSelection(warehouses, 'user-1'), {
      targetWarehouseId: 'wh-1',
      sourceWarehouseId: 'wh-2',
    });
    assert.deepEqual(resolveInitialWarehouseSelection([], 'user-1'), {
      targetWarehouseId: '',
      sourceWarehouseId: '',
    });
  });

  test('merges duplicate nomenclature rows without mutating the source', () => {
    const initial = [{ nomenclatureId: 'nom-1', nomenclatureName: 'Filter', unit: 'pcs', quantity: 2 }];
    const merged = addOrMergeLineItem(initial, {
      nomenclatureId: 'nom-1',
      nomenclatureName: 'Filter',
      unit: 'pcs',
      quantity: 3,
    });
    assert.deepEqual(merged.map((item) => item.quantity), [5]);
    assert.equal(initial[0].quantity, 2);

    const appended = addOrMergeLineItem([], {
      nomenclatureId: 'nom-2',
      nomenclatureName: 'Oil',
      unit: 'l',
      quantity: 1,
    });
    assert.equal(appended.length, 1);
  });

  test('validates required fields and builds a trimmed API payload', () => {
    assert.equal(validateTransferRequest({ sourceWarehouseId: '', targetWarehouseId: 'wh-1', requestReason: '', lineItems: [] }), 'Выберите склад-донор, у которого запрашиваются ТМЦ');
    assert.equal(validateTransferRequest({ sourceWarehouseId: 'wh-2', targetWarehouseId: '', requestReason: '', lineItems: [] }), 'Не определен ваш целевой склад');
    assert.equal(validateTransferRequest({ sourceWarehouseId: 'wh-2', targetWarehouseId: 'wh-1', requestReason: '', lineItems: [] }), 'Добавьте хотя бы одну позицию ТМЦ в заявку');

    assert.deepEqual(buildTransferRequestPayload({
      sourceWarehouseId: 'wh-2',
      targetWarehouseId: 'wh-1',
      requestReason: '  urgent maintenance  ',
      lineItems: [{ nomenclatureId: 'nom-1', quantity: 4 }],
    }), {
      sourceWarehouseId: 'wh-2',
      targetWarehouseId: 'wh-1',
      isRequest: true,
      requestReason: 'urgent maintenance',
      items: [{ nomenclatureId: 'nom-1', quantity: 4 }],
    });
  });
});
