import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchSrmIssuesList, fetchSrmStatsAndMaintenance, syncJiraIssues } from './srm-issues-service';

afterEach(() => { global.fetch = undefined as unknown as typeof fetch; });

describe('SRM issues service', () => {
  test('loads stats and maintenance independently', async () => {
    global.fetch = (async (url: string) => url.includes('/stats')
      ? Response.json({ success: true, data: { totalIssues: 2 } })
      : new Response('', { status: 500 })) as typeof fetch;
    const result = await fetchSrmStatsAndMaintenance();
    assert.equal(result.stats?.totalIssues, 2);
    assert.equal(result.maintStatus, null);
  });

  test('builds issue query parameters and parses pagination', async () => {
    let requested = '';
    global.fetch = (async (url: string) => { requested = url; return Response.json({ success: true, data: { items: [{ id: 1 }], total: 1 } }); }) as typeof fetch;
    const result = await fetchSrmIssuesList({ page: 2, pageSize: 10, search: 'pump', statusFilter: 'OPEN', priorityFilter: '' });
    assert.match(requested, /page=2/);
    assert.match(requested, /search=pump/);
    assert.deepEqual(result, { items: [{ id: 1 }], total: 1 });
  });

  test('returns safe defaults for malformed issue and sync responses', async () => {
    global.fetch = (async () => new Response('', { status: 500 })) as typeof fetch;
    assert.deepEqual(await fetchSrmIssuesList({ page: 1, pageSize: 10, search: '', statusFilter: '', priorityFilter: '' }), { items: [], total: 0 });
    assert.deepEqual(await syncJiraIssues(), { success: false, synced: 0 });
  });
});
