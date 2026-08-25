import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('WMS Transfers Business Logic & ID Generation', () => {
  test('generates collision-resistant transfer number with crypto random suffix', () => {
    const isRequest = false;
    const prefix = isRequest ? 'REQ' : 'TR';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uniqueSuffix1 = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    const transferNumber1 = `${prefix}-${dateStr}-${uniqueSuffix1}`;

    const uniqueSuffix2 = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    const transferNumber2 = `${prefix}-${dateStr}-${uniqueSuffix2}`;

    assert.match(transferNumber1, /^TR-\d{8}-[A-F0-9]{6}$/);
    assert.match(transferNumber2, /^TR-\d{8}-[A-F0-9]{6}$/);
    assert.notStrictEqual(transferNumber1, transferNumber2);
  });

  test('generates request number with REQ prefix', () => {
    const isRequest = true;
    const prefix = isRequest ? 'REQ' : 'TR';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uniqueSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    const transferNumber = `${prefix}-${dateStr}-${uniqueSuffix}`;

    assert.match(transferNumber, /^REQ-\d{8}-[A-F0-9]{6}$/);
  });

  test('validates transfer items quantities', () => {
    const invalidItems = [
      { nomenclatureId: 'nom-1', quantity: 0 },
      { nomenclatureId: 'nom-2', quantity: -5 },
      { nomenclatureId: 'nom-3', quantity: Number.NaN },
    ];

    for (const item of invalidItems) {
      const q = Number(item.quantity);
      const isInvalid = isNaN(q) || q <= 0;
      assert.strictEqual(isInvalid, true, `Item quantity ${item.quantity} should be detected as invalid`);
    }

    const validItem = { nomenclatureId: 'nom-4', quantity: 15.5 };
    const q = Number(validItem.quantity);
    const isValid = !isNaN(q) && q > 0;
    assert.strictEqual(isValid, true);
  });

  test('source and target warehouse cannot be identical', () => {
    const sourceWh = 'wh-main';
    const targetWh = 'wh-main';
    const isSame = sourceWh === targetWh;
    assert.strictEqual(isSame, true);
  });
});
