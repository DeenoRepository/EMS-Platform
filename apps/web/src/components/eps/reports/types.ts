export interface ReportColumn {
  key: string;
  name: string;
  category: string;
  unit?: string | null;
}

export interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  config: {
    selectedColumns: string[];
    filters?: any;
    sort?: any;
    title?: string;
  };
  isPublic: boolean;
  createdBy: {
    id: string;
    displayName: string;
  };
  createdAt: string;
}

export const INDUSTRY_PRESETS = [
  {
    id: 'inv_1',
    name: 'Инвентаризационная опись (ИНВ-1)',
    columns: [
      'inventoryNumber',
      'name',
      'serialNumber',
      'manufacturer',
      'model',
      'location',
      'status',
      'commissionDate',
      'responsible_person_name',
    ],
  },
  {
    id: 'metrology',
    name: 'Метрология и поверка',
    columns: [
      'inventoryNumber',
      'name',
      'serialNumber',
      'manufacturer',
      'location',
      'calibration_interval',
      'clean_room_class',
      'is_unique',
    ],
  },
  {
    id: 'condition',
    name: 'Техсостояние и износ',
    columns: [
      'inventoryNumber',
      'name',
      'status',
      'criticality',
      'actual_wear_percentage',
      'is_critical_path',
      'is_imported',
      'maintenance_periodicity',
    ],
  },
  {
    id: 'mro_plans',
    name: 'Регламенты ТОиР и ППР',
    columns: [
      'inventoryNumber',
      'name',
      'location',
      'maintenance_periodicity',
      'maintenancePlansCount',
      'sparePartsCount',
      'documentsCount',
    ],
  },
];
