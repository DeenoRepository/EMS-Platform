import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildSmartImportSubmitPayload } from './smart-import-submit';
import type { MissingFieldResolution } from './SmartImportWizard';

describe('smart import submit payload builder', () => {
  test('separates CREATE resolutions into new field definitions and preserves ignored headers', () => {
    const resolutions: Record<string, MissingFieldResolution> = {
      voltage: {
        header: 'Voltage',
        key: 'voltage',
        name: 'Voltage',
        fieldType: 'NUMBER',
        action: 'CREATE',
        unit: 'V',
        sectionId: 's1',
        sectionName: 'Electrical',
        sectionCode: 'electrical',
      } as MissingFieldResolution,
      notes: {
        header: 'Notes',
        key: 'notes',
        name: 'Notes',
        fieldType: 'TEXT',
        action: 'IGNORE',
      } as MissingFieldResolution,
    };

    const payload = buildSmartImportSubmitPayload({
      rows: [{ id: '1' } as never],
      columnMapping: { Voltage: 'voltage' },
      resolutions,
      conflictStrategy: 'UPSERT',
    });

    assert.equal(payload.newFieldDefinitions.length, 1);
    assert.equal(payload.newFieldDefinitions[0].key, 'voltage');
    assert.equal(payload.newFieldDefinitions[0].unit, 'V');
    assert.deepEqual(payload.ignoredHeaders, ['Notes']);
    assert.equal(payload.conflictStrategy, 'UPSERT');
    assert.deepEqual(payload.rows, [{ id: '1' }]);
  });

  test('returns empty arrays when there are no CREATE or IGNORE resolutions', () => {
    const payload = buildSmartImportSubmitPayload({
      rows: [],
      columnMapping: {},
      resolutions: {},
      conflictStrategy: 'SKIP',
    });
    assert.deepEqual(payload.newFieldDefinitions, []);
    assert.deepEqual(payload.ignoredHeaders, []);
  });
});
