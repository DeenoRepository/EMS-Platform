import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { applyReportPreset, applyReportTemplate, type ReportFilterState, type ReportSortState, type ReportTemplateLike } from './report-template-handlers';
import type { IndustryPreset } from '@/components/eps/reports/ReportColumnBuilderDialog';

describe('report preset and template handlers', () => {
  test('applies a preset by setting columns and the active id', () => {
    const preset = { id: 'preset-1', columns: ['name', 'status'] } as IndustryPreset;
    let columns: string[] = [];
    let activeId: string | null = null;
    applyReportPreset(preset, (value) => { columns = typeof value === 'function' ? value(columns) : value; }, (value) => { activeId = typeof value === 'function' ? value(activeId) : value; });
    assert.deepEqual(columns, ['name', 'status']);
    assert.equal(activeId, 'preset-1');
  });

  test('applies a template with filters and sort, using tmpl_ prefix for the active id', () => {
    const template: ReportTemplateLike = {
      id: 'tpl-1',
      config: {
        selectedColumns: ['name'],
        filters: { status: 'ACTIVE', search: 'pump' },
        sort: { field: 'name', order: 'desc' },
      },
    };
    let columns: string[] = [];
    let filters: ReportFilterState | null = null;
    let sort: ReportSortState | null = null;
    let activeId: string | null = null;

    applyReportTemplate(
      template,
      (value) => { columns = typeof value === 'function' ? value(columns) : value; },
      (value) => { filters = value; },
      (value) => { sort = value; },
      (value) => { activeId = typeof value === 'function' ? value(activeId) : value; },
    );

    assert.deepEqual(columns, ['name']);
    assert.deepEqual(filters, { status: 'ACTIVE', search: 'pump', manufacturer: '', location: '', dateFrom: '', dateTo: '' });
    assert.deepEqual(sort, { field: 'name', order: 'desc' });
    assert.equal(activeId, 'tmpl_tpl-1');
  });

  test('skips filters/sort updates when the template config omits them and defaults the sort field', () => {
    const template: ReportTemplateLike = { id: 'tpl-2', config: { selectedColumns: [] } };
    let filtersSet = false;
    let sortSet = false;
    applyReportTemplate(template, () => {}, () => { filtersSet = true; }, () => { sortSet = true; }, () => {});
    assert.equal(filtersSet, false);
    assert.equal(sortSet, false);
  });

  test('defaults sort field and order when template sort is a partial object', () => {
    const template: ReportTemplateLike = { id: 'tpl-3', config: { selectedColumns: [], sort: {} } };
    let sort: ReportSortState | null = null;
    applyReportTemplate(template, () => {}, () => {}, (value) => { sort = value; }, () => {});
    assert.deepEqual(sort, { field: 'inventoryNumber', order: 'asc' });
  });
});
