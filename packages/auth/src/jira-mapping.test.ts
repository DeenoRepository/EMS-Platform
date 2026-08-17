import { test, describe } from 'node:test';
import assert from 'node:assert';
import { extractValueByPath } from '../../../apps/web/src/lib/jira-service';

describe('Jira Field Extraction & Dot-Notation Engine', () => {
  const sampleJiraIssue = {
    key: 'EMS-505',
    fields: {
      summary: 'Авария шпинделя станка',
      status: {
        id: '1',
        name: 'In Progress',
      },
      priority: {
        name: 'High',
      },
      components: [
        { id: '101', name: 'Главный редуктор' },
        { id: '102', name: 'Масляный насос' },
      ],
      customfield_10100: 'ИНВ-0042',
      customfield_10042: 6.5,
    },
  };

  test('Extracts simple top-level properties', () => {
    const key = extractValueByPath(sampleJiraIssue, 'key');
    assert.strictEqual(key, 'EMS-505');
  });

  test('Extracts nested properties via dot-notation', () => {
    const summary = extractValueByPath(sampleJiraIssue, 'fields.summary');
    assert.strictEqual(summary, 'Авария шпинделя станка');

    const statusName = extractValueByPath(sampleJiraIssue, 'fields.status.name');
    assert.strictEqual(statusName, 'In Progress');

    const priorityName = extractValueByPath(sampleJiraIssue, 'fields.priority.name');
    assert.strictEqual(priorityName, 'High');
  });

  test('Extracts array items and nested array properties', () => {
    const firstComponent = extractValueByPath(sampleJiraIssue, 'fields.components[0].name');
    assert.strictEqual(firstComponent, 'Главный редуктор');

    const secondComponent = extractValueByPath(sampleJiraIssue, 'fields.components[1].name');
    assert.strictEqual(secondComponent, 'Масляный насос');
  });

  test('Extracts custom fields correctly', () => {
    const inv = extractValueByPath(sampleJiraIssue, 'fields.customfield_10100');
    assert.strictEqual(inv, 'ИНВ-0042');

    const hours = extractValueByPath(sampleJiraIssue, 'fields.customfield_10042');
    assert.strictEqual(hours, 6.5);
  });

  test('Safely returns undefined for non-existent paths without throwing', () => {
    const nonExistent = extractValueByPath(sampleJiraIssue, 'fields.nonExistentField.subProp');
    assert.strictEqual(nonExistent, undefined);

    const outOfBounds = extractValueByPath(sampleJiraIssue, 'fields.components[99].name');
    assert.strictEqual(outOfBounds, undefined);

    const nullObj = extractValueByPath(null, 'fields.summary');
    assert.strictEqual(nullObj, undefined);
  });
});
