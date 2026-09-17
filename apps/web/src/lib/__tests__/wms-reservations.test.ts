import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ownedQuantity, releaseReservation, reserveQuantity } from '../wms-reservations';

describe('WMS reservation rules', () => {
  test('moves quantity from available to reserve without changing owned total', () => {
    const initial = { available: 100, reserved: 0 };
    const reserved = reserveQuantity(initial, 25);
    assert.deepStrictEqual(reserved, { available: 75, reserved: 25 });
    assert.strictEqual(ownedQuantity(initial), ownedQuantity(reserved!));
  });

  test('releases rejected reservation back to available quantity', () => {
    const released = releaseReservation({ available: 75, reserved: 25 }, 25);
    assert.deepStrictEqual(released, { available: 100, reserved: 0 });
  });

  test('does not reserve or release invalid quantities', () => {
    assert.strictEqual(reserveQuantity({ available: 10, reserved: 0 }, 11), null);
    assert.strictEqual(reserveQuantity({ available: 10, reserved: 0 }, 0), null);
    assert.strictEqual(releaseReservation({ available: 10, reserved: 2 }, 3), null);
    assert.strictEqual(releaseReservation({ available: 10, reserved: 2 }, Number.NaN), null);
  });
});
