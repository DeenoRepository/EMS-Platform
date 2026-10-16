export interface CustomFieldDef {
  id: string;
  sectionId: string | null;
  key: string;
  name: string;
  fieldType: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';
  unit: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  options?: string[];
}

export interface CustomSectionDef {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  fields: CustomFieldDef[];
}

export interface EquipmentDocument {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  docType: string;
  version: number;
  description: string | null;
  createdAt: string;
  uploadedBy: { displayName: string };
}

export interface EquipmentPhoto {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface EquipmentDetails {
  id: string;
  name: string;
  inventoryNumber: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  status: string;
  commissionDate: string | null;
  customFields: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { displayName: string; ldapLogin: string };
  tags: { tag: { id: string; name: string; color: string | null } }[];
  photos: EquipmentPhoto[];
  documents: EquipmentDocument[];
  spareParts: {
    nomenclature: {
      id: string;
      name: string;
      article: string | null;
      unit: string;
      stockItems: { quantity: string; warehouse: { name: string } }[];
    };
  }[];
  maintenancePlans: {
    id: string;
    name: string;
    frequency: string;
    schedules: { id: string; title: string; scheduledDate: string; status: string }[];
  }[];
  jiraIssues?: {
    id: string;
    issueKey: string;
    summary: string;
    status: string;
    priority: string;
    createdDate: string;
    resolvedDate: string | null;
  }[];
  approvals?: {
    id: string;
    type: string;
    status: string;
    title: string;
    description: string | null;
    proposedData: any | null;
    createdAt: string;
    reviewedAt: string | null;
    resolutionComment: string | null;
    requester: { displayName: string; ldapLogin: string };
    reviewer: { displayName: string; ldapLogin: string } | null;
  }[];
}

export const TAB_KEY_MAP: Record<string, number> = {
  overview: 0,
  docs: 1,
  approvals: 2,
  'spare-parts': 3,
  mro: 4,
  srm: 5,
  history: 6,
};

export const TAB_INDEX_MAP = ['overview', 'docs', 'approvals', 'spare-parts', 'mro', 'srm', 'history'];
