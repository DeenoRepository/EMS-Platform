export interface EquipmentFilters {
  search?: string;
  inventoryNumber?: string;
  name?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  status?: string;
  criticality?: string; // 'A' | 'B' | 'C' | ''
  wearMin?: string;
  wearMax?: string;
  eqGroup?: string;
  eqType?: string;
  respPerson?: string;
  okofCode?: string;
  okpd2Code?: string;
  procCode?: string;
  maintPeriodicity?: string;
  calibrationIntervalMin?: string;
  calibrationIntervalMax?: string;
  cleanRoom?: string;
  isCriticalPath?: string; // '' | 'all' | 'true' | 'false'
  isUnique?: string; // '' | 'all' | 'true' | 'false'
  isImported?: string; // '' | 'all' | 'true' | 'false'
  documentsFilter?: string; // '' | 'all' | 'with' | 'without'
  sparePartsFilter?: string; // '' | 'all' | 'with' | 'without'
  tagId?: string;
  commissionDateFrom?: string;
  commissionDateTo?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
}

export const DEFAULT_EQUIPMENT_FILTERS: EquipmentFilters = {
  search: '',
  inventoryNumber: '',
  name: '',
  serialNumber: '',
  manufacturer: '',
  model: '',
  location: '',
  status: '',
  criticality: '',
  wearMin: '',
  wearMax: '',
  eqGroup: '',
  eqType: '',
  respPerson: '',
  okofCode: '',
  okpd2Code: '',
  procCode: '',
  maintPeriodicity: '',
  calibrationIntervalMin: '',
  calibrationIntervalMax: '',
  cleanRoom: '',
  isCriticalPath: '',
  isUnique: '',
  isImported: '',
  documentsFilter: '',
  sparePartsFilter: '',
  tagId: '',
  commissionDateFrom: '',
  commissionDateTo: '',
  createdAtFrom: '',
  createdAtTo: '',
  updatedAtFrom: '',
  updatedAtTo: '',
};

export interface ActiveFilterItem {
  key: keyof EquipmentFilters | 'wearRange' | 'calibrationRange' | 'commissionDateRange' | 'createdAtRange' | 'updatedAtRange';
  keysToReset: (keyof EquipmentFilters)[];
  label: string;
  value: string;
}
