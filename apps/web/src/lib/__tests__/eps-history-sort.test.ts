import assert from 'node:assert/strict';
import test from 'node:test';
import { sortHistoryItems, getHistorySortValue } from '../../app/eps/history/history-sort';
import type { AuditLogItem } from '../../components/eps/history/AuditDiffModal';

function log(overrides: Partial<AuditLogItem> = {}): AuditLogItem {
  return {
    id: 'log-1',
    userId: 'user-1',
    action: 'UPDATE',
    entityType: 'Equipment',
    entityId: 'equipment-1',
    changes: null,
    ipAddress: null,
    createdAt: '2026-08-30T10:00:00.000Z',
    user: { id: 'user-1', displayName: 'Алексей', ldapLogin: 'alexey' },
    equipment: { id: 'equipment-1', name: 'Насос', inventoryNumber: 'EQ-001' },
    ...overrides,
  };
}

test('sorts supported text fields in both directions', () => {
  const items = [
    log({ id: 'b', action: 'UPDATE', user: { id: 'u2', displayName: 'Борис', ldapLogin: 'boris' } }),
    log({ id: 'a', action: 'CREATE', user: { id: 'u1', displayName: 'Анна', ldapLogin: 'anna' } }),
  ];

  assert.deepEqual(sortHistoryItems(items, 'user', 'asc').map((item) => item.id), ['a', 'b']);
  assert.deepEqual(sortHistoryItems(items, 'action', 'desc').map((item) => item.id), ['b', 'a']);
  assert.deepEqual(sortHistoryItems(items, 'entityType', 'asc').map((item) => item.id), ['b', 'a']);
  assert.deepEqual(sortHistoryItems(items, 'equipment', 'asc').map((item) => item.id), ['b', 'a']);
});

test('sorts dates numerically and uses zero for an invalid date', () => {
  const items = [
    log({ id: 'later', createdAt: '2026-08-30T12:00:00.000Z' }),
    log({ id: 'invalid', createdAt: 'not-a-date' }),
    log({ id: 'earlier', createdAt: '2026-08-30T08:00:00.000Z' }),
  ];

  assert.deepEqual(sortHistoryItems(items, 'createdAt', 'asc').map((item) => item.id), ['invalid', 'earlier', 'later']);
  assert.equal(getHistorySortValue(log({ createdAt: '' }), 'createdAt'), 0);
});

test('uses unknown-field fallback and does not mutate the input', () => {
  const items = [log({ id: 'b' }), log({ id: 'a' })];
  const original = [...items];

  assert.deepEqual(sortHistoryItems(items, 'id', 'asc').map((item) => item.id), ['a', 'b']);
  assert.deepEqual(items, original);
  assert.equal(sortHistoryItems(items, '', 'asc'), items);
});

test('falls back from missing display names and equipment names', () => {
  const item = log({
    user: { id: 'user-1', displayName: '', ldapLogin: 'fallback-login' },
    equipment: { id: 'equipment-1', name: '', inventoryNumber: 'EQ-002' },
  });

  assert.equal(getHistorySortValue(item, 'user'), 'fallback-login');
  assert.equal(getHistorySortValue(item, 'equipment'), 'EQ-002');
});
