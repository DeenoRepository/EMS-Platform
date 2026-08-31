import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { dispatchWmsTransfer } from './quick-dispatch';

afterEach(() => {
  global.fetch = undefined as unknown as typeof fetch;
});

describe('dispatchWmsTransfer', () => {
  test('reports success when the response is ok and success is true', async () => {
    global.fetch = (async () => Response.json({ success: true })) as typeof fetch;
    const result = await dispatchWmsTransfer('t1');
    assert.deepEqual(result, { success: true, error: undefined });
  });

  test('reports failure with the server error message on a non-ok response', async () => {
    global.fetch = (async () => Response.json({ success: false, error: 'Перемещение уже отгружено' }, { status: 400 })) as typeof fetch;
    const result = await dispatchWmsTransfer('t1');
    assert.equal(result.success, false);
    assert.equal(result.error, 'Перемещение уже отгружено');
  });

  test('treats a non-string error field as undefined', async () => {
    global.fetch = (async () => Response.json({ success: false, error: { code: 500 } }, { status: 500 })) as typeof fetch;
    const result = await dispatchWmsTransfer('t1');
    assert.equal(result.error, undefined);
  });
});
