import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildMroExecutionSubmitPayload, type ChecklistItemDefinition } from './mro-execution-submit';

const checklistItems: ChecklistItemDefinition[] = [
  { id: 'i1', description: 'Check oil', itemType: 'BOOLEAN' },
  { id: 'i2', description: 'Record pressure', itemType: 'NUMERIC' },
];

describe('mro execution submit payload builder', () => {
  test('maps checklist answers to their definitions and preserves notes/parts', () => {
    const payload = buildMroExecutionSubmitPayload({
      notes: '  all good  ',
      checklistAnswers: {
        i1: { value: true, note: 'ok' },
        i2: { value: 4.5 },
      },
      checklistItems,
      usedParts: [{ nomenclatureId: 'n1', warehouseId: 'w1', quantity: 2 }],
    });

    assert.equal(payload.status, 'COMPLETED');
    assert.equal(payload.notes, 'all good');
    assert.equal(payload.checklistItems.length, 2);
    assert.deepEqual(payload.checklistItems[0], {
      itemId: 'i1',
      description: 'Check oil',
      itemType: 'BOOLEAN',
      value: true,
      note: 'ok',
    });
    assert.deepEqual(payload.usedParts, [{ nomenclatureId: 'n1', warehouseId: 'w1', quantity: 2 }]);
  });

  test('falls back to empty description and BOOLEAN type for an unknown checklist item id', () => {
    const payload = buildMroExecutionSubmitPayload({
      notes: '',
      checklistAnswers: { unknown: { value: false } },
      checklistItems,
      usedParts: [],
    });
    assert.deepEqual(payload.checklistItems[0], {
      itemId: 'unknown',
      description: '',
      itemType: 'BOOLEAN',
      value: false,
      note: undefined,
    });
    assert.equal(payload.notes, undefined);
  });
});
