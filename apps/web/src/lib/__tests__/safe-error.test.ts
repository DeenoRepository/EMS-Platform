import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { toSafeErrorDetails } from '../safe-error';

describe('safe API error details', () => {
  test('keeps the internal Error message for logging and hides it from the public response', () => {
    const details = toSafeErrorDetails(new Error('postgres password leaked'), 'Ошибка обработки запроса');

    assert.equal(details.publicError, 'Ошибка обработки запроса');
    assert.equal(details.logMessage, 'postgres password leaked');
  });

  test('normalizes unknown thrown values', () => {
    const details = toSafeErrorDetails({ secret: 'value' }, 'Внутренняя ошибка');

    assert.equal(details.publicError, 'Внутренняя ошибка');
    assert.equal(details.logMessage, 'Unknown error');
  });
});
