import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AuditLogItem } from '@/components/eps/history/AuditDiffModal';
import { getHistorySortValue, sortHistoryItems } from './history-sort';

function item(id: string, createdAt: string, name: string): AuditLogItem {
  return {
    id,
    userId: 'u1',
    action: 'UPDATE',
    entityType: 'Equipment',
    entityId: id,
    changes: null,
    ipAddress: null,
    createdAt,
    user: { displayName: name, ldapLogin: name },
    equipment: { name, inventoryNumber: id },
  } as AuditLogItem;
}

describe('EPS history sort model', () => {
  test('handles valid and invalid dates and nested fallbacks', () => {
    assert.equal(getHistorySortValue(item('1', 'invalid', 'Pump'), 'createdAt'), 0);
    assert.equal(getHistorySortValue(item('1', '2026-01-01', 'Pump'), 'equipment'), 'Pump');
    assert.equal(getHistorySortValue(item('1', '2026-01-01', 'Pump'), 'user'), 'Pump');
  });

  test('sorts history without mutating source', () => {
    const items = [item('2', '2026-02-01', 'Beta'), item('1', '2026-01-01', 'Alpha')];
    assert.deepEqual(sortHistoryItems(items, 'createdAt', 'asc').map((entry) => entry.id), ['1', '2']);
    assert.equal(sortHistoryItems(items, '', 'asc'), items);
  });
});
