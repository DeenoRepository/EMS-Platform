import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseZoneResponse } from './zone-response';

describe('zone response parsing', () => {
  test('returns the zone array on success with array data', () => {
    const zones = [{ id: 'z1', name: 'Zone A' }];
    assert.deepEqual(parseZoneResponse({ success: true, data: zones }), zones);
  });

  test('returns null when success is false', () => {
    assert.equal(parseZoneResponse({ success: false, data: [] }), null);
  });

  test('returns null when data is not an array', () => {
    assert.equal(parseZoneResponse({ success: true, data: { id: 'z1' } }), null);
    assert.equal(parseZoneResponse({ success: true, data: undefined }), null);
  });
});
