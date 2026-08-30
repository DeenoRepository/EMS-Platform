import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildAuditHistoryStats,
  buildAuditHistoryWhereInput,
  enrichAuditLogs,
  parseAuditHistoryQuery,
} from './get-query';

test('parses audit history pagination and trimmed filters', () => {
  assert.deepEqual(parseAuditHistoryQuery(new URLSearchParams({
    page: '0',
    pageSize: '500',
    action: ' UPDATE ',
    equipmentId: ' eq-1 ',
    userId: ' user-1 ',
    search: ' pump ',
    startDate: ' 2026-08-01 ',
    endDate: ' 2026-08-30 ',
  })), {
    page: 1,
    pageSize: 100,
    action: 'UPDATE',
    equipmentId: 'eq-1',
    userId: 'user-1',
    search: 'pump',
    startDate: '2026-08-01',
    endDate: '2026-08-30',
  });
});

test('builds audit filters and date bounds', () => {
  const { where, entityTypes } = buildAuditHistoryWhereInput({
    action: 'UPDATE',
    equipmentId: 'eq-1',
    userId: 'user-1',
    search: 'pump',
    startDate: '2026-08-01',
    endDate: '2026-08-30',
  });

  assert.deepEqual(entityTypes, [
    'Equipment', 'EquipmentDocument', 'EquipmentApproval', 'Photo', 'CustomField', 'EquipmentCustomSection',
  ]);
  assert.deepEqual(where, {
    entityType: { in: entityTypes },
    action: 'UPDATE',
    userId: 'user-1',
    entityId: 'eq-1',
    OR: [
      { user: { displayName: { contains: 'pump', mode: 'insensitive' } } },
      { user: { ldapLogin: { contains: 'pump', mode: 'insensitive' } } },
      { entityId: { contains: 'pump', mode: 'insensitive' } },
    ],
    createdAt: {
      gte: new Date('2026-08-01'),
      lte: new Date('2026-08-30T23:59:59.999'),
    },
  });
});

test('enriches equipment logs and preserves fallback behavior', () => {
  const logs = enrichAuditLogs([
    {
      entityType: 'Equipment', entityId: 'eq-1', changes: { name: { new: 'Pump A' }, inventoryNumber: { new: 'INV-1' } },
    },
    {
      entityType: 'EquipmentDocument', entityId: 'doc-1', changes: { equipmentId: 'eq-2', equipmentName: 'Pump B' },
    },
    { entityType: 'Photo', entityId: 'photo-1', changes: {} },
  ], [{ id: 'eq-1', name: 'Stored Pump', inventoryNumber: 'INV-STORED' }]);

  assert.deepEqual(logs.map((log) => log.equipment), [
    { id: 'eq-1', name: 'Stored Pump', inventoryNumber: 'INV-STORED' },
    { id: 'eq-2', name: 'Pump B', inventoryNumber: null },
    null,
  ]);
});

test('counts audit action statistics', () => {
  assert.deepEqual(buildAuditHistoryStats([
    { action: 'CREATE' }, { action: 'UPDATE' }, { action: 'UPDATE' }, { action: 'DELETE' }, { action: 'OTHER' },
  ]), { total: 5, creates: 1, updates: 2, deletes: 1 });
});
