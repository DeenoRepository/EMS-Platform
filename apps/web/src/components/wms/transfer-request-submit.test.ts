import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addOrMergeLineItem,
  buildTransferRequestPayload,
  resolveInitialWarehouseSelection,
  validateTransferRequest,
} from './transfer-request-submit';

describe('transfer request submit model', () => {
  test('selects the user warehouse and a distinct donor', () => {
    assert.deepEqual(resolveInitialWarehouseSelection([
      { id: 'w1', name: 'One', code: '1', responsibleUserId: 'u1' },
      { id: 'w2', name: 'Two', code: '2' },
    ], 'u1'), { targetWarehouseId: 'w1', sourceWarehouseId: 'w2' });
    assert.deepEqual(resolveInitialWarehouseSelection([], 'u1'), { targetWarehouseId: '', sourceWarehouseId: '' });
  });

  test('merges duplicate nomenclature quantities without mutating input', () => {
    const input = [{ nomenclatureId: 'n1', nomenclatureName: 'Part', unit: 'pcs', quantity: 2 }];
    const result = addOrMergeLineItem(input, { ...input[0], quantity: 3 });
    assert.equal(result[0].quantity, 5);
    assert.equal(input[0].quantity, 2);
  });

  test('validates required warehouses and line items', () => {
    assert.match(validateTransferRequest({ sourceWarehouseId: '', targetWarehouseId: 'w2', requestReason: '', lineItems: [] }) ?? '', /донор/);
    assert.match(validateTransferRequest({ sourceWarehouseId: 'w1', targetWarehouseId: '', requestReason: '', lineItems: [] }) ?? '', /целевой/);
    assert.match(validateTransferRequest({ sourceWarehouseId: 'w1', targetWarehouseId: 'w2', requestReason: '', lineItems: [] }) ?? '', /позицию/);
  });

  test('builds a trimmed request payload', () => {
    assert.deepEqual(buildTransferRequestPayload({ sourceWarehouseId: 'w1', targetWarehouseId: 'w2', requestReason: '  urgent  ', lineItems: [{ nomenclatureId: 'n1', quantity: 4 }] }), {
      sourceWarehouseId: 'w1', targetWarehouseId: 'w2', isRequest: true, requestReason: 'urgent', items: [{ nomenclatureId: 'n1', quantity: 4 }],
    });
  });
});
