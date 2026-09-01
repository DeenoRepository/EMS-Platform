import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_JIRA_FIELD_MAPPING,
  applyJiraFieldMapping,
  extractValueByPath,
} from './field-mapping';

const sampleIssue = {
  key: 'EMS-104',
  fields: {
    summary: 'Pump overheating',
    status: { name: 'Done' },
    priority: { name: 'Highest' },
    issuetype: { name: 'Incident' },
    assignee: { displayName: 'Operator One' },
    reporter: { displayName: 'Engineer One' },
    created: '2026-08-31T10:00:00.000Z',
    resolutiondate: '2026-08-31T12:30:00.000Z',
    customfield_10042: '2.5',
    customfield_10100: 'INV-42',
    components: [{ name: 'Cooling circuit' }],
  },
};

const equipment = {
  id: 'equipment-42',
  name: 'Cooling pump',
  inventoryNumber: 'INV-42',
  serialNumber: 'SN-42',
};

test('extractValueByPath resolves nested properties and array indexes', () => {
  assert.equal(extractValueByPath(sampleIssue, 'fields.status.name'), 'Done');
  assert.equal(extractValueByPath(sampleIssue, 'fields.components[0].name'), 'Cooling circuit');
  assert.equal(extractValueByPath(sampleIssue, 'fields.missing.value'), undefined);
  assert.equal(extractValueByPath(sampleIssue, ''), undefined);
});

test('applyJiraFieldMapping transforms standard/custom fields and matches equipment cache', async () => {
  const mapped = await applyJiraFieldMapping(sampleIssue, DEFAULT_JIRA_FIELD_MAPPING, [equipment]);

  assert.equal(mapped.issueKey, 'EMS-104');
  assert.equal(mapped.summary, 'Pump overheating');
  assert.equal(mapped.status, 'Closed');
  assert.equal(mapped.priority, 'Highest');
  assert.equal(mapped.assignee, 'Operator One');
  assert.equal(mapped.customFields?.downtimeHours, 2.5);
  assert.equal(mapped.customFields?.component, 'Cooling circuit');
  assert.equal(mapped.equipmentId, 'equipment-42');
  assert.equal(mapped.createdDate.toISOString(), '2026-08-31T10:00:00.000Z');
  assert.equal(mapped.resolvedDate?.toISOString(), '2026-08-31T12:30:00.000Z');
});

test('applyJiraFieldMapping applies defaults and leaves unmatched regex equipment unresolved', async () => {
  const config = {
    ...DEFAULT_JIRA_FIELD_MAPPING,
    equipmentMatching: {
      sourcePath: 'fields.summary',
      matchBy: 'regex' as const,
      regexPattern: 'INV[-_#]?([A-Za-z0-9-]+)',
    },
  };
  const mapped = await applyJiraFieldMapping(
    { key: 'EMS-105', fields: { summary: 'no inventory reference' } },
    config,
    [equipment],
  );

  assert.equal(mapped.issueKey, 'EMS-105');
  assert.equal(mapped.status, 'Open');
  assert.equal(mapped.priority, 'Medium');
  assert.equal(mapped.issueType, 'Incident');
  assert.equal(mapped.equipmentId, null);
  assert.equal(mapped.customFields?.downtimeHours, '0');
});
