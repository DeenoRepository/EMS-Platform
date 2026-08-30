import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applySidebarDataUpdate, loadSidebarData, mapSidebarResponses, type SidebarDataSetters } from './sidebar-load-data';

function response(payload: unknown, ok = true): Response {
  return new Response(JSON.stringify(payload), { status: ok ? 200 : 500 });
}

test('loadSidebarData requests all sidebar data sources and maps successful responses', async () => {
  const requests: string[] = [];
  const data = await loadSidebarData(async (input) => {
    requests.push(String(input));
    const payloads: Record<string, unknown> = {
      '/api/eps/equipment?pageSize=1': { success: true, data: { statusCounts: { underRepair: 3 } } },
      '/api/modules/status': { success: true, data: { eps: true, wms: false } },
      '/api/eps/approvals?pageSize=1': { success: true, data: { stats: { toReview: 2, myRejected: 1 } } },
      '/api/wms/stats': { success: true, data: { lowStockCount: 4, activeInventoriesCount: 5 } },
      '/api/srm/stats': { success: true, data: { openIssues: 6, inProgressIssues: 7 } },
      '/api/mro/schedules': { success: true, data: [{ status: 'MISSED', scheduledDate: '2099-01-01' }, { status: 'PLANNED', scheduledDate: '2099-01-01' }] },
      '/api/wms/transfers?pageSize=1': { success: true, data: { counts: { inbound: 8, requests: 9 } } },
    };
    return response(payloads[String(input)]);
  });

  assert.equal(requests.length, 7);
  assert.deepEqual(data, {
    repairCount: 3,
    moduleStatus: { eps: true, wms: false },
    pendingApprovalsCount: 2,
    rejectedApprovalsCount: 1,
    wmsLowStockCount: 4,
    wmsActiveInventoriesCount: 5,
    wmsPendingTransfersCount: 17,
    srmOpenCount: 6,
    srmInProgressCount: 7,
    mroOverdueCount: 1,
    mroPlannedCount: 1,
  });
});

test('loadSidebarData ignores rejected and non-ok endpoint responses', async () => {
  const data = await loadSidebarData(async (input) => {
    if (String(input) === '/api/wms/stats') return response({ success: true, data: { lowStockCount: 4 } }, false);
    throw new Error('network failure');
  });

  assert.deepEqual(data, {});
});

test('applySidebarDataUpdate applies only present fields, including null and zero', () => {
  const calls: string[] = [];
  const setters: SidebarDataSetters = {
    setRepairCount: (value) => calls.push(`repair:${value}`),
    setModuleStatus: (value) => calls.push(`modules:${value.wms}`),
    setPendingApprovalsCount: (value) => calls.push(`pending:${value}`),
    setRejectedApprovalsCount: (value) => calls.push(`rejected:${value}`),
    setWmsLowStockCount: (value) => calls.push(`low:${value}`),
    setWmsActiveInventoriesCount: (value) => calls.push(`inventory:${value}`),
    setWmsPendingTransfersCount: (value) => calls.push(`transfers:${value}`),
    setSrmOpenCount: (value) => calls.push(`srm-open:${value}`),
    setSrmInProgressCount: (value) => calls.push(`srm-progress:${value}`),
    setMroOverdueCount: (value) => calls.push(`overdue:${value}`),
    setMroPlannedCount: (value) => calls.push(`planned:${value}`),
  };

  applySidebarDataUpdate({ repairCount: 0, moduleStatus: { wms: false }, srmOpenCount: 0, mroOverdueCount: null }, setters);

  assert.deepEqual(calls, ['repair:0', 'modules:false', 'srm-open:0', 'overdue:null']);
});

test('mapSidebarResponses preserves fallback and zero-value mappings', () => {
  const responses = Array.from({ length: 7 }, () => ({ status: 'fulfilled', value: response({}) } as PromiseFulfilledResult<Response>));
  const payloads = [
    { success: true, data: { statusCounts: { underRepair: 0 } } },
    { success: true, data: { eps: true } },
    { success: true, data: { stats: { pending: 0 } } },
    { success: true, data: { data: { lowStockCount: 0, activeInventoriesCount: 0 } } },
    { success: true, data: { data: { openIssues: 0, inProgressIssues: 0 } } },
    { success: true, data: { data: [] } },
    { success: true, data: { counts: { inbound: 0, requests: 0 } } },
  ] as const;

  const update = mapSidebarResponses(responses, payloads);
  assert.equal(update.repairCount, null);
  assert.equal(update.pendingApprovalsCount, null);
  assert.equal(update.wmsPendingTransfersCount, null);
  assert.equal(update.srmOpenCount, 0);
});
