import { describe, test } from 'node:test';
import assert from 'node:assert';
import { ownedQuantity, releaseReservation, reserveQuantity } from '../wms-reservations';

describe('WMS approved business rules', () => {
  test('in-transit quantity remains owned while unavailable', () => {
    const balance = reserveQuantity({ available: 100, reserved: 0 }, 30);
    assert.deepStrictEqual(balance, { available: 70, reserved: 30 });
    assert.strictEqual(ownedQuantity(balance!), 100);
  });

  test('rejection releases the in-transit reserve', () => {
    assert.deepStrictEqual(releaseReservation({ available: 70, reserved: 30 }, 30), {
      available: 100,
      reserved: 0,
    });
  });

  test('reservation cannot consume already reserved quantity', () => {
    assert.strictEqual(reserveQuantity({ available: 0, reserved: 100 }, 1), null);
  });
});
