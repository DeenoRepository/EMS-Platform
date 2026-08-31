import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReportCsv, buildReportJson } from './report-export';

const columns = [{ key: 'name', name: 'Name' }, { key: 'note', name: 'Note' }] as never;

describe('report export serializers', () => {
  test('escapes CSV quotes and emits BOM', () => {
    const csv = buildReportCsv([{ name: 'Pump', note: 'A "critical" item' }], columns);
    assert.ok(csv.startsWith('\uFEFF'));
    assert.match(csv, /"A ""critical"" item"/);
  });

  test('maps missing JSON values to null', () => {
    const json = JSON.parse(buildReportJson([{ name: 'Pump' }], columns));
    assert.deepEqual(json, [{ Name: 'Pump', Note: null }]);
  });
});
