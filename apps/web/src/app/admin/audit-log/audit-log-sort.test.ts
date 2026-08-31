import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { sortAuditLogs } from './audit-log-sort';

const log = (id: string, createdAt: string, displayName: string | null) => ({ id, action: 'UPDATE', entityType: 'Equipment', entityId: id, changes: null, ipAddress: null, userAgent: null, createdAt, user: displayName ? { id: 'u', ldapLogin: 'user', displayName } : null });

describe('audit log sort model', () => {
  test('sorts dates numerically in both directions', () => {
    const items = [log('old', '2026-01-01', 'A'), log('new', '2026-02-01', 'B')];
    assert.deepEqual(sortAuditLogs(items, 'createdAt', 'asc').map((item) => item.id), ['old', 'new']);
    assert.deepEqual(sortAuditLogs(items, 'createdAt', 'desc').map((item) => item.id), ['new', 'old']);
  });

  test('sorts user fallback and preserves identity for empty sort field', () => {
    const items = [log('b', '2026-01-01', null), log('a', '2026-01-01', 'Alpha')];
    assert.deepEqual(sortAuditLogs(items, 'user', 'asc').map((item) => item.id), ['b', 'a']);
    assert.equal(sortAuditLogs(items, '', 'asc'), items);
  });
});
