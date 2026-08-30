import assert from 'node:assert/strict';
import test from 'node:test';
import { submitOperationRequest } from '../../components/wms/operation-submit';
import type { OperationSubmitInput } from '../../components/wms/operation-submit';

const input: OperationSubmitInput = {
  operationType: 'RECEIPT',
  warehouseId: 'warehouse-1',
  targetWarehouseId: 'warehouse-2',
  equipmentId: '',
  recipientName: '',
  comment: 'test operation',
  lineItems: [{
    nomenclatureId: 'nom-1',
    nomenclatureName: 'Bearing',
    unit: 'pcs',
    quantity: 2,
  }],
};

function response(payload: unknown, ok = true): Response {
  return new Response(JSON.stringify(payload), { status: ok ? 200 : 400 });
}

test('submits regular operation and maps success', async () => {
  let requestUrl = '';
  const outcome = await submitOperationRequest(input, async (url) => {
    requestUrl = String(url);
    return response({ success: true, data: { id: 'operation-1' } });
  });

  assert.equal(requestUrl, '/api/wms/operations');
  assert.deepEqual(outcome, {
    kind: 'success',
    operationId: 'operation-1',
    message: 'Складская операция успешно проведена',
    variant: 'success',
  });
});

test('submits transfer and preserves server success message', async () => {
  const outcome = await submitOperationRequest({ ...input, operationType: 'TRANSFER' }, async (url) => {
    assert.equal(url, '/api/wms/transfers');
    return response({ success: true, message: 'Transfer accepted', data: { id: 'transfer-1' } });
  });

  assert.equal(outcome.operationId, 'transfer-1');
  assert.equal(outcome.message, 'Transfer accepted');
});

test('maps API error response', async () => {
  const outcome = await submitOperationRequest(input, async () => response({ success: false, error: 'Validation failed' }, false));

  assert.deepEqual(outcome, {
    kind: 'api-error',
    message: 'Validation failed',
    variant: 'error',
  });
});

test('propagates network errors for owner notification mapping', async () => {
  await assert.rejects(
    submitOperationRequest(input, async () => {
      throw new Error('network');
    }),
    /network/,
  );
});
