import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('EPS Field Catalog & Import Mapping', () => {
  it('EquipmentFieldsCatalogView component renders catalog table with fields, keys, units and sections created from scratch without autocompletion', () => {
    const componentSource = readProjectFile('apps/web/src/components/eps/EquipmentFieldsCatalogView.tsx');
    assert.match(componentSource, /Справочник полей паспорта оборудования/);
    assert.doesNotMatch(componentSource, /DATABASE_EQUIPMENT_FIELD_OPTIONS/);
    assert.doesNotMatch(componentSource, /Быстро заполнить из типовых реквизитов/);
    assert.match(componentSource, /fetch\('\/api\/eps\/custom-fields'\)/);
    assert.match(componentSource, /fetch\('\/api\/eps\/custom-sections'\)/);
    assert.match(componentSource, /handleSaveField/);
    assert.match(componentSource, /handleDeleteField/);
  });

  it('Module settings page integrates EquipmentFieldsCatalogView in EPS tab', () => {
    const adminSource = readProjectFile('apps/web/src/app/admin/module-settings/page.tsx');
    assert.match(adminSource, /<EquipmentFieldsCatalogView \/>/);
    assert.match(adminSource, /EquipmentFieldsCatalogView/);
  });

  it('Passport fields catalog is located strictly in module settings and excluded from sidebar', () => {
    const sidebarSource = readProjectFile('apps/web/src/components/layout/Sidebar.tsx');
    assert.doesNotMatch(sidebarSource, /Справочник полей паспорта/);

    const adminSource = readProjectFile('apps/web/src/app/admin/module-settings/page.tsx');
    assert.match(adminSource, /<EquipmentFieldsCatalogView \/>/);
  });

  it('SmartImportWizard provides manual mapping table for all file columns to catalog fields', () => {
    const importSource = readProjectFile('apps/web/src/components/eps/SmartImportWizard.tsx');
    assert.match(importSource, /MAP_EXISTING/);
    assert.match(importSource, /Из справочника/);
    assert.match(importSource, /Выберите поле из справочника/);
    assert.match(importSource, /Сбросить все назначения/);
    assert.match(importSource, /catalogFields/);
  });

  it('Import analyze API returns catalogFields for column binding', () => {
    const analyzeApiSource = readProjectFile('apps/web/src/app/api/eps/import/analyze/route.ts');
    assert.match(analyzeApiSource, /catalogFields:\s*existingCustomFields\.map/);
  });
});
