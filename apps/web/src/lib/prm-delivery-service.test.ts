import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { OperationType, PurchaseRequestStatus } from '@ems/database';
import {
  buildReceiptOperationPayload,
  calculateDeliveryStatus,
  calculateReceivedQuantity,
  validateDeliveryInput,
} from './prm-delivery-service';

function requestItem(overrides: Partial<{ id: string; nomenclatureId: string; requestedQty: number; receivedQty: number }> = {}) {
  return {
    id: 'request-item-1',
    nomenclatureId: 'nom-1',
    requestedQty: 10,
    receivedQty: 0,
    ...overrides,
  };
}

describe('PRM delivery service', () => {
  test('calculates IN_PROGRESS when no quantity has been received', () => {
    assert.equal(calculateDeliveryStatus([requestItem()]), PurchaseRequestStatus.IN_PROGRESS);
  });

  test('calculates PARTIALLY_DELIVERED when some quantity is received', () => {
    assert.equal(
      calculateDeliveryStatus([requestItem({ receivedQty: 4 })]),
      PurchaseRequestStatus.PARTIALLY_DELIVERED,
    );
  });

  test('calculates DELIVERED when every item reaches requested quantity', () => {
    assert.equal(
      calculateDeliveryStatus([
        requestItem({ receivedQty: 10 }),
        requestItem({ id: 'request-item-2', receivedQty: 3, requestedQty: 3 }),
      ]),
      PurchaseRequestStatus.DELIVERED,
    );
  });

  test('rejects delivery for an unapproved request', () => {
    const result = validateDeliveryInput({
      requestStatus: PurchaseRequestStatus.SUBMITTED,
      requestItems: [requestItem()],
      deliveryItems: [{ requestItemId: 'request-item-1', nomenclatureId: 'nom-1', receivedQty: 1 }],
    });
    assert.equal(result.valid, false);
    assert.match(result.error ?? '', /статус/i);
  });

  test('rejects zero and negative delivery quantities', () => {
    for (const receivedQty of [0, -1]) {
      const result = validateDeliveryInput({
        requestStatus: PurchaseRequestStatus.APPROVED,
        requestItems: [requestItem()],
        deliveryItems: [{ requestItemId: 'request-item-1', nomenclatureId: 'nom-1', receivedQty }],
      });
      assert.equal(result.valid, false);
      assert.match(result.error ?? '', /больше нуля/i);
    }
  });

  test('rejects delivery over the remaining requested quantity', () => {
    const result = validateDeliveryInput({
      requestStatus: PurchaseRequestStatus.IN_PROGRESS,
      requestItems: [requestItem({ requestedQty: 10, receivedQty: 6 })],
      deliveryItems: [{ requestItemId: 'request-item-1', nomenclatureId: 'nom-1', receivedQty: 5 }],
    });
    assert.equal(result.valid, false);
    assert.match(result.error ?? '', /превышает/i);
  });

  test('rejects duplicate request items and foreign request items', () => {
    const duplicate = validateDeliveryInput({
      requestStatus: PurchaseRequestStatus.APPROVED,
      requestItems: [requestItem()],
      deliveryItems: [
        { requestItemId: 'request-item-1', nomenclatureId: 'nom-1', receivedQty: 1 },
        { requestItemId: 'request-item-1', nomenclatureId: 'nom-1', receivedQty: 1 },
      ],
    });
    assert.equal(duplicate.valid, false);

    const foreign = validateDeliveryInput({
      requestStatus: PurchaseRequestStatus.APPROVED,
      requestItems: [requestItem()],
      deliveryItems: [{ requestItemId: 'foreign-item', nomenclatureId: 'nom-1', receivedQty: 1 }],
    });
    assert.equal(foreign.valid, false);
  });

  test('builds a receipt operation payload with the request reference', () => {
    const payload = buildReceiptOperationPayload({
      warehouseId: 'warehouse-1',
      createdById: 'user-1',
      supplierName: '  Supplier  ',
      document: '  INV-1  ',
      requestNumber: 'PR-20260902-ABC123',
      items: [{ requestItemId: 'request-item-1', nomenclatureId: 'nom-1', receivedQty: 4 }],
    });

    assert.deepEqual(payload, {
      type: OperationType.RECEIPT,
      warehouseId: 'warehouse-1',
      createdById: 'user-1',
      counterparty: 'Supplier',
      document: 'INV-1',
      comment: 'Приёмка по заявке PRM PR-20260902-ABC123',
      items: [{ nomenclatureId: 'nom-1', quantity: 4 }],
    });
  });

  test('adds a delivery quantity to the cumulative received quantity', () => {
    assert.equal(calculateReceivedQuantity('2.5', 1.5), 4);
  });
});
