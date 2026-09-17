import { test, describe } from 'node:test';
import assert from 'node:assert';
import { reconcileLedger } from '../wms-reconciliation';

describe('WMS ledger reconciliation', () => {
  test('reproduces signed receipt, issue and transfer balances', () => {
    const result = reconcileLedger([
      { id: 'receipt', warehouseId: 'a', nomenclatureId: 'n', eventType: 'RECEIPT', deltaQuantity: '100' },
      { id: 'issue', warehouseId: 'a', nomenclatureId: 'n', eventType: 'ISSUE', deltaQuantity: '-25' },
      { id: 'out', warehouseId: 'a', nomenclatureId: 'n', eventType: 'TRANSFER_OUT', deltaQuantity: '-10' },
      { id: 'in', warehouseId: 'b', nomenclatureId: 'n', eventType: 'TRANSFER_IN', deltaQuantity: '10' },
    ]);

    assert.deepStrictEqual(result.violations, []);
    assert.deepStrictEqual(result.balances, [
      { warehouseId: 'a', nomenclatureId: 'n', ledgerQuantity: '65' },
      { warehouseId: 'b', nomenclatureId: 'n', ledgerQuantity: '10' },
    ]);
  });

  test('reports invalid and negative history instead of clamping it', () => {
    const result = reconcileLedger([
      { id: 'bad', warehouseId: 'a', nomenclatureId: 'n', eventType: 'RECEIPT', deltaQuantity: 'NaN' },
      { id: 'issue', warehouseId: 'a', nomenclatureId: 'n', eventType: 'ISSUE', deltaQuantity: '-1' },
    ]);

    assert.deepStrictEqual(result.violations, [
      { movementId: 'bad', reason: 'INVALID_DELTA' },
      { movementId: 'issue', reason: 'NEGATIVE_INTERMEDIATE_BALANCE' },
    ]);
    assert.deepStrictEqual(result.balances, []);
  });

  test('keeps decimal quantities exact at six fractional digits', () => {
    const result = reconcileLedger([
      { id: 'one', warehouseId: 'a', nomenclatureId: 'n', eventType: 'RECEIPT', deltaQuantity: '0.1' },
      { id: 'two', warehouseId: 'a', nomenclatureId: 'n', eventType: 'RECEIPT', deltaQuantity: '0.2' },
      { id: 'three', warehouseId: 'a', nomenclatureId: 'n', eventType: 'ISSUE', deltaQuantity: '-0.3' },
    ]);

    assert.deepStrictEqual(result.violations, []);
    assert.deepStrictEqual(result.balances, [{ warehouseId: 'a', nomenclatureId: 'n', ledgerQuantity: '0' }]);
  });
});
