export interface EquipmentItem {
  id: string;
  name: string;
  inventoryNumber: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  status: string;
  commissionDate: string | null;
  primaryPhoto: string | null;
  customFields?: Record<string, any> | null;
  tags: { id: string; name: string; color: string | null }[];
  counts?: { documents: number; photos: number; maintenancePlans: number; spareParts: number };
  _count?: { documents?: number; photos?: number; maintenancePlans?: number; spareParts?: number };
  createdAt: string;
  updatedAt: string;
}

export interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

export interface CustomFieldDefItem {
  id: string;
  key: string;
  name: string;
  fieldType: string;
  unit: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  options: string[] | null;
  sortOrder: number;
}

export interface CustomSectionDefItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  fields: CustomFieldDefItem[];
}

export interface EquipmentKpiCounts {
  total: number;
  active: number;
  underRepair: number;
  inStorage: number;
  decommissioned: number;
}

export const DEFAULT_KPI_COUNTS: EquipmentKpiCounts = {
  total: 0,
  active: 0,
  underRepair: 0,
  inStorage: 0,
  decommissioned: 0,
};
