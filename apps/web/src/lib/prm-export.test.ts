import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPurchaseRequestCsv, PURCHASE_REQUEST_EXPORT_COLUMNS } from './prm-export';

describe('PRM purchase request CSV export', () => {
  test('emits the expected column header', () => {
    const csv = buildPurchaseRequestCsv([]);
    assert.equal(csv, `\uFEFF${PURCHASE_REQUEST_EXPORT_COLUMNS.join(',')}`);
  });

  test('escapes commas, quotes, and newlines in values', () => {
    const csv = buildPurchaseRequestCsv([
      {
        requestNumber: 'PR-1',
        status: 'REJECTED',
        priority: 'HIGH',
        warehouse: 'Main, warehouse',
        requester: 'User "A"',
        supplierName: 'Supplier\nLLC',
        estimatedTotal: 1250,
        currency: 'RUB',
        createdAt: '2026-09-02T00:00:00.000Z',
        itemsCount: 2,
      },
    ]);

    assert.match(csv, /Main, warehouse/);
    assert.match(csv, /"User ""A"""/);
    assert.match(csv, /"Supplier\nLLC"/);
    assert.match(csv, /1250,RUB/);
  });

  test('renders null supplier as an empty CSV field', () => {
    const csv = buildPurchaseRequestCsv([
      {
        requestNumber: 'PR-2',
        status: 'DRAFT',
        priority: 'LOW',
        warehouse: 'Main',
        requester: 'User',
        supplierName: null,
        estimatedTotal: '0',
        currency: 'RUB',
        createdAt: new Date('2026-09-02T00:00:00.000Z'),
        itemsCount: 0,
      },
    ]);
    const row = csv.split('\n')[1];
    assert.equal(row.split(',')[5], '');
  });
});
