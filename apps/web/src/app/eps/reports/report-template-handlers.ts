import type { Dispatch, SetStateAction } from 'react';
import type { IndustryPreset } from '@/components/eps/reports/ReportColumnBuilderDialog';

export interface ReportFilterState {
  status: string;
  search: string;
  manufacturer: string;
  location: string;
  dateFrom: string;
  dateTo: string;
}

export interface ReportSortState {
  field: string;
  order: 'asc' | 'desc';
}

export interface ReportTemplateLike {
  id: string;
  config: {
    selectedColumns: string[];
    filters?: {
      status?: string;
      search?: string;
      manufacturer?: string;
      location?: string;
      commissionDateFrom?: string;
      commissionDateTo?: string;
    };
    sort?: { field?: string; order?: 'asc' | 'desc' };
  };
}

export function applyReportPreset(
  preset: IndustryPreset,
  setSelectedColumnKeys: Dispatch<SetStateAction<string[]>>,
  setActivePresetOrTemplateId: Dispatch<SetStateAction<string | null>>,
) {
  setSelectedColumnKeys(preset.columns);
  setActivePresetOrTemplateId(preset.id);
}

export function applyReportTemplate(
  template: ReportTemplateLike,
  setSelectedColumnKeys: Dispatch<SetStateAction<string[]>>,
  setFilters: (filters: ReportFilterState) => void,
  setSort: (sort: ReportSortState) => void,
  setActivePresetOrTemplateId: Dispatch<SetStateAction<string | null>>,
) {
  setSelectedColumnKeys(template.config.selectedColumns);
  if (template.config.filters) {
    setFilters({
      status: template.config.filters.status || '',
      search: template.config.filters.search || '',
      manufacturer: template.config.filters.manufacturer || '',
      location: template.config.filters.location || '',
      dateFrom: template.config.filters.commissionDateFrom || '',
      dateTo: template.config.filters.commissionDateTo || '',
    });
  }
  if (template.config.sort) {
    setSort({ field: template.config.sort.field || 'inventoryNumber', order: template.config.sort.order || 'asc' });
  }
  setActivePresetOrTemplateId(`tmpl_${template.id}`);
}
