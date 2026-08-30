import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  handleWarehouseSubmitResponse,
} from './warehouse-submit';

describe('warehouse submit response handling', () => {
  test('maps create success and invokes success callback', async () => {
    const messages: string[] = [];

    await handleWarehouseSubmitResponse(
      { ok: true, json: async () => ({ success: true }) },
      null,
      {
        onSuccess: (message) => messages.push(message),
        onApiError: (message) => messages.push(`error:${message}`),
      },
    );

    assert.deepStrictEqual(messages, ['Склад успешно создан']);
  });

  test('maps update success and invokes success callback', async () => {
    const messages: string[] = [];

    await handleWarehouseSubmitResponse(
      { ok: true, json: async () => ({ success: true }) },
      'warehouse-1',
      {
        onSuccess: (message) => messages.push(message),
        onApiError: (message) => messages.push(`error:${message}`),
      },
    );

    assert.deepStrictEqual(messages, ['Склад обновлен']);
  });

  test('maps API error and preserves the server message', async () => {
    const messages: string[] = [];

    await handleWarehouseSubmitResponse(
      { ok: false, json: async () => ({ error: 'Склад уже существует' }) },
      null,
      {
        onSuccess: (message) => messages.push(`success:${message}`),
        onApiError: (message) => messages.push(message),
      },
    );

    assert.deepStrictEqual(messages, ['Склад уже существует']);
  });

  test('uses the fallback API error when the response has no error', async () => {
    const messages: string[] = [];

    await handleWarehouseSubmitResponse(
      { ok: true, json: async () => ({ success: false }) },
      null,
      {
        onSuccess: (message) => messages.push(`success:${message}`),
        onApiError: (message) => messages.push(message),
      },
    );

    assert.deepStrictEqual(messages, ['Ошибка сохранения склада']);
  });
});
