import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { toSafeErrorDetails, safeErrorResponse } from '../safe-error';

describe('safe API error details', () => {
  test('keeps the internal Error message for logging and hides it from the public response', () => {
    const details = toSafeErrorDetails(new Error('postgres password leaked'), 'Ошибка обработки запроса');

    assert.equal(details.publicError, 'Ошибка обработки запроса');
    assert.equal(details.logMessage, 'postgres password leaked');
    assert.ok(details.correlationId);
  });

  test('normalizes unknown thrown values', () => {
    const details = toSafeErrorDetails({ secret: 'value' }, 'Внутренняя ошибка');

    assert.equal(details.publicError, 'Внутренняя ошибка');
    assert.equal(details.logMessage, 'Unknown error');
    assert.ok(details.correlationId);
  });

  test('safeErrorResponse returns sanitized json response', async () => {
    const response = safeErrorResponse(new Error('Sensitive DB Connection string with password'), 'Ошибка сервера', 500);
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.error, 'Ошибка сервера');
    assert.ok(body.correlationId);
    assert.equal(typeof body.details, 'undefined');
  });
});
