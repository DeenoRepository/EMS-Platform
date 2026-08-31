import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEquipmentLifecycleEvents } from './equipment-lifecycle-events';

const equipmentFixture = {
  id: 'eq-1', name: 'Pump', inventoryNumber: 'INV-1', location: 'Shop',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z',
  commissionDate: '2026-01-02T00:00:00Z',
  maintenancePlans: [{ id: 'plan-1', name: 'Monthly', frequency: 'Monthly' }],
  spareParts: [{ nomenclature: { id: 'part-1', name: 'Seal', article: 'S-1', unit: 'pcs' } }],
  jiraIssues: [{ id: 'issue-1', issueKey: 'EMS-1', summary: 'Leak', priority: 'HIGH', status: 'Open', createdDate: '2026-01-04T00:00:00Z' }],
};

describe('equipment lifecycle events', () => {
  test('builds commissioning, maintenance, parts, incident, and audit events', () => {
    const events = buildEquipmentLifecycleEvents(equipmentFixture as never, [{ id: 'log-1', action: 'CREATE', createdAt: '2026-01-05T00:00:00Z' }]);
    assert.equal(events.length, 5);
    assert.equal(events[0].id, 'audit-log-1');
    assert.ok(events.some((event) => event.type === 'PARTS_REPLACED'));
    assert.ok(events.some((event) => event.type === 'INCIDENT'));
  });

  test('omits optional commissioning and handles empty collections', () => {
    const minimalFixture = { ...equipmentFixture, commissionDate: null, maintenancePlans: [], spareParts: [], jiraIssues: [] };
    assert.deepEqual(buildEquipmentLifecycleEvents(minimalFixture as never, []), []);
  });
});
