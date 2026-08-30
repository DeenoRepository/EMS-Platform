import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSrmIssuePatchModel } from '../../app/api/srm/issues/[id]/patch-update-model';

const createdDate = new Date('2026-08-30T10:00:00.000Z');

function existing(overrides: Partial<{ resolvedDate: Date | null; downtimeMinutes: number | null; createdDate: Date }> = {}) {
  return { resolvedDate: null, downtimeMinutes: null, createdDate, ...overrides };
}

test('copies supported partial fields and normalizes scalar values', () => {
  const result = buildSrmIssuePatchModel({
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assignee: 'tech-1',
    resolutionNotes: ' fixed ',
    downtimeMinutes: '12',
    failureCategory: 'MECHANICAL',
    warrantyClaim: 1,
    contractorName: 'Vendor',
    equipmentId: 'equipment-1',
  }, existing());

  assert.deepEqual(result.dataToUpdate, {
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assignee: 'tech-1',
    resolutionNotes: ' fixed ',
    downtimeMinutes: 12,
    failureCategory: 'MECHANICAL',
    warrantyClaim: true,
    contractorName: 'Vendor',
    equipmentId: 'equipment-1',
  });
  assert.equal(result.isNowResolved, false);
});

test('sets resolved date and derives downtime when resolving a new issue', () => {
  const now = Date.parse('2026-08-30T12:30:00.000Z');
  const result = buildSrmIssuePatchModel({ status: 'CLOSED' }, existing(), now);

  assert.equal(result.isNowResolved, true);
  assert.equal((result.dataToUpdate.resolvedDate as Date).getTime(), now);
  assert.equal(result.dataToUpdate.downtimeMinutes, 150);
});

test('preserves existing resolution and explicit downtime', () => {
  const resolvedDate = new Date('2026-08-30T11:00:00.000Z');
  const result = buildSrmIssuePatchModel(
    { status: 'РЕШЕН', downtimeMinutes: '7' },
    existing({ resolvedDate, downtimeMinutes: 3 }),
    Date.parse('2026-08-30T15:00:00.000Z'),
  );

  assert.equal(result.isNowResolved, true);
  assert.deepEqual(result.dataToUpdate, { status: 'РЕШЕН', downtimeMinutes: 7 });
});

test('does not derive resolution fields for non-resolved status', () => {
  const result = buildSrmIssuePatchModel({ status: 'OPEN' }, existing(), Date.now());

  assert.deepEqual(result.dataToUpdate, { status: 'OPEN' });
  assert.equal(result.isNowResolved, false);
});
