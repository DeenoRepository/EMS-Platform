import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApprovalProposedData,
  computeEquipmentHealthScore,
  loadAuditLogs,
  loadEquipmentAndMeta,
} from './equipment-passport-actions';

afterEach(() => { global.fetch = undefined as unknown as typeof fetch; });

describe('equipment passport actions', () => {
  test('computes status and issue-sensitive health scores', () => {
    assert.equal(computeEquipmentHealthScore(null), 100);
    assert.equal(computeEquipmentHealthScore({ status: 'DECOMMISSIONED' } as never), 10);
    assert.equal(computeEquipmentHealthScore({ status: 'ACTIVE', jiraIssues: [{ status: 'Open' }], maintenancePlans: [] } as never), 85);
    assert.equal(computeEquipmentHealthScore({ status: 'ACTIVE', jiraIssues: [], maintenancePlans: [{}] } as never), 100);
  });

  test('builds approval payloads by type and rejects unknown types', () => {
    assert.deepEqual(buildApprovalProposedData('STATUS_CHANGE', 'INACTIVE'), { targetStatus: 'INACTIVE' });
    assert.deepEqual(buildApprovalProposedData('DECOMMISSIONING', 'ACTIVE'), { targetStatus: 'DECOMMISSIONED' });
    assert.equal(buildApprovalProposedData('UNKNOWN', 'ACTIVE'), null);
  });

  test('loads equipment and metadata independently', async () => {
    global.fetch = (async (url: string) => url.includes('custom-sections')
      ? Response.json({ success: true, data: { sections: [{ id: 's1' }], unassignedFields: [] } })
      : Response.json({ success: true, data: { name: 'Pump', status: 'ACTIVE', commissionDate: '2026-01-02T00:00:00Z', customFields: { x: 1 } } })) as typeof fetch;
    const result = await loadEquipmentAndMeta('e1');
    assert.equal(result.editForm?.commissionDate, '2026-01-02');
    assert.equal(result.sections?.length, 1);
    assert.deepEqual(result.editCustomFields, { x: 1 });
  });

  test('returns null for failed audit responses', async () => {
    global.fetch = (async () => new Response('', { status: 500 })) as typeof fetch;
    assert.equal(await loadAuditLogs('e1'), null);
  });
});
