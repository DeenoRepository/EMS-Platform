import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEquipmentApprovalProposal,
  buildEquipmentUpdateData,
  getEffectiveCommissionDate,
  parseEquipmentDate,
} from '../../app/api/eps/equipment/[id]/patch-update-model';

const existing = {
  name: ' Pump ',
  inventoryNumber: 'INV-1',
  serialNumber: null,
  manufacturer: 'Acme',
  model: 'M1',
  location: null,
  status: 'ACTIVE' as const,
  commissionDate: new Date('2024-01-01T00:00:00.000Z'),
  customFields: { existing: true },
  tags: [{ tagId: 'tag-1' }],
};

 test('parses valid dates and rejects empty or invalid values', () => {
  assert.deepEqual(parseEquipmentDate('2025-05-06'), new Date('2025-05-06T00:00:00.000Z'));
  assert.equal(parseEquipmentDate(''), null);
  assert.equal(parseEquipmentDate('invalid'), null);
});

test('prefers commissionDate over legacy commissioningDate', () => {
  assert.deepEqual(getEffectiveCommissionDate({ commissionDate: '2025-01-01', commissioningDate: '2026-01-01' }), new Date('2025-01-01T00:00:00.000Z'));
  assert.deepEqual(getEffectiveCommissionDate({ commissioningDate: '2026-01-01' }), new Date('2026-01-01T00:00:00.000Z'));
});

test('builds normalized approval proposal while preserving omitted values', () => {
  const proposal = buildEquipmentApprovalProposal(
      { name: ' New Pump ', inventoryNumber: ' ', customFields: { voltage: 220 }, tagIds: ['tag-2'] },
      existing,
      new Date('2025-02-03T00:00:00.000Z'),
    );

  assert.deepEqual(proposal, {
    name: 'New Pump',
    inventoryNumber: null,
    serialNumber: null,
    manufacturer: 'Acme',
    model: 'M1',
    location: null,
    status: 'ACTIVE',
    commissionDate: '2025-02-03T00:00:00.000Z',
    customFields: { voltage: 220 },
    tagIds: ['tag-2'],
  });
});

test('builds direct update data with nullable strings and cloned custom fields', () => {
  const customFields = { voltage: 220 };
    const update = buildEquipmentUpdateData(
      { name: ' New Pump ', manufacturer: ' ', customFields },
      new Date('2025-02-03T00:00:00.000Z'),
    );

  assert.deepEqual(update, {
    name: 'New Pump',
    inventoryNumber: undefined,
    serialNumber: undefined,
    manufacturer: null,
    model: undefined,
    location: undefined,
    status: undefined,
    commissionDate: undefined,
    customFields,
  });
  assert.notEqual(update.customFields, customFields);
});
