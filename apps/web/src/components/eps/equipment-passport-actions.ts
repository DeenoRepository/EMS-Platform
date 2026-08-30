import type {
  EquipmentDetails,
  CustomSectionDef,
  CustomFieldDef,
  EquipmentEditFormState,
} from '@/app/eps/[id]/page';
import type { EquipmentAuditLog } from '@/components/eps/EquipmentAuditHistoryTab';

interface ApiResult {
  success: boolean;
  error?: string;
}

/**
 * Computes the equipment health score used on the passport overview.
 * Extracted from the page's `useMemo` to remove branches from the enclosing
 * component's measured cyclomatic complexity; behavior is unchanged.
 */
export function computeEquipmentHealthScore(equipment: EquipmentDetails | null): number {
  if (!equipment) return 100;
  if (equipment.status === 'DECOMMISSIONED') return 10;
  if (equipment.status === 'UNDER_REPAIR') return 45;
  if (equipment.status === 'IN_STORAGE') return 75;
  const openIssues = (equipment.jiraIssues || []).filter(
    (i) => i.status !== 'Closed' && i.status !== 'Resolved'
  ).length;
  const plansCount = (equipment.maintenancePlans || []).length;
  return Math.max(50, Math.min(100, 95 - openIssues * 10 + (plansCount > 0 ? 5 : 0)));
}

export interface EquipmentAndMetaResult {
  equipment: EquipmentDetails | null;
  editForm: EquipmentEditFormState | null;
  editCustomFields: Record<string, unknown> | null;
  sections: CustomSectionDef[] | null;
  unassignedFields: CustomFieldDef[] | null;
}

/**
 * Fetches equipment details and custom-section metadata in parallel.
 * The two results are intentionally independent (mirrors the original inline
 * logic): a failed equipment fetch does not prevent sections from being set,
 * and vice versa.
 */
export async function loadEquipmentAndMeta(id: string): Promise<EquipmentAndMetaResult> {
  const [eqRes, secRes] = await Promise.all([
    fetch(`/api/eps/equipment/${id}`),
    fetch('/api/eps/custom-sections'),
  ]);

  const result: EquipmentAndMetaResult = {
    equipment: null,
    editForm: null,
    editCustomFields: null,
    sections: null,
    unassignedFields: null,
  };

  if (eqRes.ok) {
    const json = await eqRes.json();
    if (json.success && json.data) {
      result.equipment = json.data;
      result.editForm = {
        name: json.data.name,
        inventoryNumber: json.data.inventoryNumber || '',
        serialNumber: json.data.serialNumber || '',
        manufacturer: json.data.manufacturer || '',
        model: json.data.model || '',
        location: json.data.location || '',
        status: json.data.status,
        commissionDate: json.data.commissionDate ? json.data.commissionDate.split('T')[0] : '',
      };
      result.editCustomFields = json.data.customFields || {};
    }
  }

  if (secRes.ok) {
    const secJson = await secRes.json();
    if (secJson.success && secJson.data) {
      result.sections = secJson.data.sections || [];
      result.unassignedFields = secJson.data.unassignedFields || [];
    }
  }

  return result;
}

/**
 * Fetches the equipment audit log. Returns null on failure/empty response,
 * matching the original silent-ignore behavior.
 */
export async function loadAuditLogs(id: string): Promise<EquipmentAuditLog[] | null> {
  const res = await fetch(`/api/eps/equipment/${id}/audit`);
  if (res.ok) {
    const json = await res.json();
    if (json.success) return json.data;
  }
  return null;
}

/**
 * Builds the `proposedData` payload for an approval request based on its
 * type. Extracted from the inline if/else-if chain in handleCreateApproval.
 */
export function buildApprovalProposedData(
  type: string,
  targetStatus: string
): Record<string, string> | null {
  if (type === 'STATUS_CHANGE') return { targetStatus };
  if (type === 'DECOMMISSIONING') return { targetStatus: 'DECOMMISSIONED' };
  if (type === 'COMMISSIONING') return { targetStatus: 'ACTIVE' };
  return null;
}

export async function submitApprovalRequest(params: {
  equipmentId: string;
  type: string;
  title: string;
  description: string;
  proposedData: Record<string, string> | null;
}): Promise<ApiResult> {
  const res = await fetch('/api/eps/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      equipmentId: params.equipmentId,
      type: params.type,
      title: params.title,
      description: params.description,
      proposedData: params.proposedData,
    }),
  });
  const data = await res.json();
  return { success: Boolean(data.success), error: data.error };
}

export async function saveEquipmentEdit(params: {
  id: string;
  editForm: EquipmentEditFormState;
  editCustomFields: Record<string, unknown>;
  submitForApproval: boolean;
}): Promise<ApiResult> {
  const res = await fetch(`/api/eps/equipment/${params.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params.editForm,
      customFields: params.editCustomFields,
      submitForApproval: params.submitForApproval,
    }),
  });
  const data = await res.json();
  return { success: Boolean(data.success), error: data.error };
}

export async function deleteEquipmentById(id: string): Promise<ApiResult> {
  const res = await fetch(`/api/eps/equipment/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return { success: Boolean(data.success), error: data.error };
}

export async function deleteEquipmentDocument(documentId: string): Promise<ApiResult> {
  const res = await fetch(`/api/eps/documents/${documentId}`, { method: 'DELETE' });
  const data = await res.json();
  return { success: Boolean(data.success), error: data.error };
}

export async function uploadEquipmentDocument(params: {
  file: File;
  equipmentId: string;
  docType: string;
  description: string;
}): Promise<ApiResult> {
  const fd = new FormData();
  fd.append('file', params.file);
  fd.append('equipmentId', params.equipmentId);
  fd.append('docType', params.docType);
  fd.append('description', params.description);

  const res = await fetch('/api/eps/documents', { method: 'POST', body: fd });
  const data = await res.json();
  return { success: Boolean(data.success), error: data.error };
}

export async function submitEquipmentForApproval(id: string): Promise<ApiResult> {
  const res = await fetch(`/api/eps/equipment/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submitForApproval: true }),
  });
  const data = await res.json();
  return { success: Boolean(data.success), error: data.error };
}
