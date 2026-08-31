import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildOperationSubmitPayload,
  buildOperationSubmitRequest,
  submitOperationRequest,
  type OperationSubmitInput,
} from './operation-submit';

function baseInput(overrides: Partial<OperationSubmitInput> = {}): OperationSubmitInput {
  return {
    operationType: 'INCOME' as never,
    warehouseId: 'w1',
    targetWarehouseId: '',
    equipmentId: '',
    recipientName: '',
    comment: '',
    lineItems: [{ nomenclatureId: 'n1', quantity: 5 } as never],
    ...overrides,
  };
}

describe('operation submit payload builder', () => {
  test('builds a transfer payload with source/target warehouse and trimmed reason', () => {
    const payload = buildOperationSubmitPayload(
      baseInput({ operationType: 'TRANSFER' as never, targetWarehouseId: 'w2', comment: '  urgent  ' }),
    );
    assert.deepEqual(payload, {
      sourceWarehouseId: 'w1',
      targetWarehouseId: 'w2',
      isRequest: false,
      requestReason: 'urgent',
      items: [{ nomenclatureId: 'n1', quantity: 5 }],
    });
  });

  test('builds a non-transfer payload with type and optional equipment/recipient fields', () => {
    const writeOff = buildOperationSubmitPayload(
      baseInput({ operationType: 'ISSUE_WRITE_OFF' as never, equipmentId: 'e1' }),
    );
    assert.equal(writeOff.type, 'ISSUE_WRITE_OFF');
    assert.equal((writeOff as { equipmentId?: string }).equipmentId, 'e1');

    const issue = buildOperationSubmitPayload(
      baseInput({ operationType: 'ISSUE_EMPLOYEE' as never, recipientName: '  Bob  ' }),
    );
    assert.equal((issue as { recipientName?: string }).recipientName, 'Bob');
  });

  test('routes transfer submissions to the transfers endpoint and others to operations', () => {
    const transferRequest = buildOperationSubmitRequest(baseInput({ operationType: 'TRANSFER' as never }));
    assert.equal(transferRequest.url, '/api/wms/transfers');

    const operationRequest = buildOperationSubmitRequest(baseInput());
    assert.equal(operationRequest.url, '/api/wms/operations');
  });

  test('maps a successful response to a success outcome with an operation id', async () => {
    const fetcher = (async () => Response.json({ success: true, data: { id: 'op-1' } })) as typeof fetch;
    const outcome = await submitOperationRequest(baseInput(), fetcher);
    assert.equal(outcome.kind, 'success');
    assert.equal(outcome.operationId, 'op-1');
  });

  test('maps a transfer success to a transfer-specific message', async () => {
    const fetcher = (async () => Response.json({ success: true, message: 'custom', data: { id: 'op-1' } })) as typeof fetch;
    const outcome = await submitOperationRequest(baseInput({ operationType: 'TRANSFER' as never }), fetcher);
    assert.equal(outcome.message, 'custom');
  });

  test('maps a failed response to an api-error outcome with the server message', async () => {
    const fetcher = (async () => Response.json({ success: false, error: 'Недостаточно остатка' }, { status: 400 })) as typeof fetch;
    const outcome = await submitOperationRequest(baseInput(), fetcher);
    assert.equal(outcome.kind, 'api-error');
    assert.equal(outcome.message, 'Недостаточно остатка');
  });

  test('falls back to a generic error message when the server omits one', async () => {
    const fetcher = (async () => Response.json({ success: false }, { status: 500 })) as typeof fetch;
    const outcome = await submitOperationRequest(baseInput({ operationType: 'TRANSFER' as never }), fetcher);
    assert.match(outcome.message, /перемещения/);
  });
});
