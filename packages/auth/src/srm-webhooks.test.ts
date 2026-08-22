import { test, describe } from 'node:test';
import assert from 'node:assert';
import { extractIssueFromWebhookPayload } from '../../../apps/web/src/lib/srm-providers';

describe('SRM Webhooks Payload Parsers Suite', () => {
  test('Extracts issue from Jira webhook payload', () => {
    const jiraWebhook = {
      timestamp: 1672531199000,
      webhookEvent: 'jira:issue_created',
      issue_event_type_name: 'issue_created',
      user: { name: 'admin' },
      issue: {
        id: '10042',
        key: 'EMS-777',
        fields: {
          summary: 'Отказ привода ЧПУ станка',
          priority: { name: 'Highest' },
          status: { name: 'Open' },
        },
      },
    };

    const extracted = extractIssueFromWebhookPayload(jiraWebhook);
    assert.ok(extracted);
    assert.strictEqual(extracted.key, 'EMS-777');
    assert.strictEqual(extracted.fields.summary, 'Отказ привода ЧПУ станка');
  });

  test('Extracts issue from GitLab webhook payload and constructs references', () => {
    const gitlabWebhook = {
      object_kind: 'issue',
      user: { username: 'mechanic_ivan' },
      project: { path_with_namespace: 'factory/cnc-maintenance' },
      object_attributes: {
        id: 991,
        iid: 45,
        title: 'Утечка масла в редукторе',
        state: 'opened',
        priority: 'High',
      },
    };

    const extracted = extractIssueFromWebhookPayload(gitlabWebhook);
    assert.ok(extracted);
    assert.strictEqual(extracted.title, 'Утечка масла в редукторе');
    assert.strictEqual(extracted.references?.full, 'factory/cnc-maintenance#45');
    assert.strictEqual(extracted.author?.username, 'mechanic_ivan');
  });

  test('Extracts issue from Redmine webhook payload', () => {
    const redmineWebhook = {
      action: 'opened',
      issue: {
        id: 301,
        subject: 'Плановый осмотр конвейера',
        status: { id: 1, name: 'Новая' },
        priority: { id: 4, name: 'Срочный' },
      },
    };

    const extracted = extractIssueFromWebhookPayload(redmineWebhook);
    assert.ok(extracted);
    assert.strictEqual(extracted.id, 301);
    assert.strictEqual(extracted.subject, 'Плановый осмотр конвейера');
  });

  test('Extracts raw issue directly from Generic REST payload', () => {
    const genericPayload = {
      issueKey: 'INC-2026-99',
      summary: 'Превышение температуры подшипника',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
    };

    const extracted = extractIssueFromWebhookPayload(genericPayload);
    assert.ok(extracted);
    assert.strictEqual(extracted.issueKey, 'INC-2026-99');
    assert.strictEqual(extracted.priority, 'CRITICAL');
  });

  test('Safely returns null for invalid or empty webhook payloads', () => {
    assert.strictEqual(extractIssueFromWebhookPayload(null), null);
    assert.strictEqual(extractIssueFromWebhookPayload(undefined), null);
    assert.strictEqual(extractIssueFromWebhookPayload('invalid string'), null);
    assert.strictEqual(extractIssueFromWebhookPayload({}), null);
  });
});
