import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionEquipmentStatus, equipmentVisibilityWhere } from '../eps-state-machine';

describe('EPS equipment visibility and state machine', () => {
  test('hides чужие drafts from regular users', () => {
    assert.deepEqual(equipmentVisibilityWhere('user-1', false), {
      deletedAt: null,
      OR: [{ status: { not: 'DRAFT' } }, { status: 'DRAFT', createdById: 'user-1' }],
    });
  });

  test('requires approval to publish drafts and decommission equipment', () => {
    assert.equal(canTransitionEquipmentStatus('DRAFT', 'ACTIVE'), false);
    assert.equal(canTransitionEquipmentStatus('DRAFT', 'ACTIVE', true), true);
    assert.equal(canTransitionEquipmentStatus('ACTIVE', 'DECOMMISSIONED'), false);
    assert.equal(canTransitionEquipmentStatus('ACTIVE', 'DECOMMISSIONED', true), true);
    assert.equal(canTransitionEquipmentStatus('DECOMMISSIONED', 'ACTIVE', true), false);
  });
});
