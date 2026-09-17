import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { auditLegacyRecords, mapLegacyInventory, mapLegacyOperation } = require('../../../../../scripts/wms-legacy-mapping.js');

type LegacyMovement = { deltaQuantity: string; requiresReview?: boolean };
type LegacyViolation = { reason: string };

describe('WMS legacy mapping', () => {
  test('maps receipt and issue to signed movements', () => {
    const result = mapLegacyOperation({
      id: 'op-1',
      warehouseId: 'wh-1',
      type: 'RECEIPT',
      items: [{ id: 'item-1', nomenclatureId: 'nom-1', quantity: '2.5' }],
    });
    assert.deepStrictEqual(result.violations, []);
    assert.strictEqual(result.movements[0].deltaQuantity, '2.5');

    const issue = mapLegacyOperation({
      id: 'op-2',
      warehouseId: 'wh-1',
      type: 'ISSUE_WRITE_OFF',
      items: [{ id: 'item-2', nomenclatureId: 'nom-1', quantity: 1 }],
    });
    assert.strictEqual(issue.movements[0].deltaQuantity, '-1');
  });

  test('does not invent mapping for transfer or adjustment', () => {
    const transfer = mapLegacyOperation({ id: 'op-1', warehouseId: 'wh-1', type: 'TRANSFER', items: [] });
    const adjustment = mapLegacyOperation({ id: 'op-2', warehouseId: 'wh-1', type: 'ADJUSTMENT', items: [] });
    assert.strictEqual(transfer.movements.length, 0);
    assert.strictEqual(adjustment.movements.length, 0);
    assert.strictEqual(transfer.violations[0].reason, 'AMBIGUOUS_LEGACY_OPERATION_TYPE');
    assert.strictEqual(adjustment.violations[0].reason, 'AMBIGUOUS_LEGACY_OPERATION_TYPE');
  });

  test('maps inventory difference only as review-required movement', () => {
    const result = mapLegacyInventory({
      id: 'inv-1',
      warehouseId: 'wh-1',
      items: [
        { id: 'inv-item-1', nomenclatureId: 'nom-1', expectedQty: 10, actualQty: 8 },
        { id: 'inv-item-2', nomenclatureId: 'nom-2', expectedQty: 2, actualQty: 5 },
      ],
    });
    assert.deepStrictEqual(result.violations, []);
    assert.deepStrictEqual(result.movements.map((movement: LegacyMovement) => movement.deltaQuantity), ['-2', '3']);
    assert.ok(result.movements.every((movement: LegacyMovement) => movement.requiresReview));
  });

  test('audit is read-only and reports transfers and missing stock rows', () => {
    const report = auditLegacyRecords({
      operations: [{ id: 'op-1', warehouseId: 'wh-1', type: 'RECEIPT', items: [{ id: 'item-1', nomenclatureId: 'nom-1', quantity: 1 }] }],
      transfers: [{ id: 'transfer-1', status: 'COMPLETED' }],
      stockItems: [],
    });
    assert.strictEqual(report.readOnly, true);
    assert.strictEqual(report.canBackfill, false);
    assert.ok(report.violations.some((violation: LegacyViolation) => violation.reason === 'TRANSFER_REQUIRES_STATUS_AND_STOCK_TIMELINE_REVIEW'));
    assert.ok(report.violations.some((violation: LegacyViolation) => violation.reason === 'NO_CURRENT_STOCK_ROW'));
  });
});
