import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('EPS Sections & Custom Fields Management & Passport Specifications', () => {
  it('Custom sections API supports POST, PATCH, and DELETE operations', () => {
    const apiSource = readProjectFile('apps/web/src/app/api/eps/custom-sections/route.ts');
    assert.match(apiSource, /export async function POST/);
    assert.match(apiSource, /export async function PATCH/);
    assert.match(apiSource, /export async function DELETE/);
    assert.match(apiSource, /prisma\.customSection\.create/);
    assert.match(apiSource, /prisma\.customSection\.update/);
    assert.match(apiSource, /prisma\.customSection\.delete/);
  });

  it('Custom fields API supports POST and DELETE mutations', () => {
    const apiSource = readProjectFile('apps/web/src/app/api/eps/custom-fields/route.ts');
    assert.match(apiSource, /export async function POST/);
    assert.match(apiSource, /export async function DELETE/);
    assert.match(apiSource, /prisma\.customFieldDefinition\.upsert/);
    assert.match(apiSource, /prisma\.customFieldDefinition\.delete/);
  });

  it('EPS equipment registry tableColumns dynamically display only configured sections characteristics and exclude tags', () => {
    const pageSource = readProjectFile('apps/web/src/app/eps/page.tsx');
    // Ensure tags column is removed
    assert.doesNotMatch(pageSource, /\{\s*id:\s*'tags'/);

    // Dynamic columns from active sections
    assert.match(pageSource, /const tableColumns = useMemo/);
    assert.match(pageSource, /for \(const sec of sections\)/);
    assert.match(pageSource, /renderDynamicTableCell/);

    // Database fields catalog defines canonical mappings
    const dbFieldsSource = readProjectFile('apps/web/src/lib/eps-database-fields.ts');
    assert.match(dbFieldsSource, /decimal_number/);
    assert.match(dbFieldsSource, /okof_code/);
    assert.match(dbFieldsSource, /okpd2_code/);
    assert.match(dbFieldsSource, /process_classifier_code/);
    assert.match(dbFieldsSource, /equipment_group/);
    assert.match(dbFieldsSource, /equipment_type/);
    assert.match(dbFieldsSource, /country_origin/);
    assert.match(dbFieldsSource, /prod_year/);
    assert.match(dbFieldsSource, /criticality/);
    assert.match(dbFieldsSource, /maintenance_periodicity/);
    assert.match(dbFieldsSource, /operating_voltage/);
    assert.match(dbFieldsSource, /power_kw/);
    assert.match(dbFieldsSource, /operating_pressure/);
    assert.match(dbFieldsSource, /is_critical_path/);
  });

  it('Admin module settings page allows adding, editing and deleting technical sections and fields without tags column', () => {
    const adminSource = readProjectFile('apps/web/src/app/admin/module-settings/page.tsx');
    // Ensure tags column is removed
    assert.doesNotMatch(adminSource, /Метки и классификаторы/);
    assert.doesNotMatch(adminSource, /Добавить метку/);
    assert.doesNotMatch(adminSource, /Создание классификатора \/ метки/);

    // Ensure section create/edit/delete buttons are present
    assert.match(adminSource, /Добавить раздел/);
    assert.match(adminSource, /Добавить параметр/);
    assert.match(adminSource, /title="Удалить раздел"/);
    assert.match(adminSource, /title="Редактировать раздел"/);
    assert.match(adminSource, /title="Редактировать параметр"/);
    assert.match(adminSource, /title="Удалить параметр"/);
  });

  it('Equipment passport page (/eps/[id]) removes unassigned fields block and only shows configured sections', () => {
    const passportSource = readProjectFile('apps/web/src/app/eps/[id]/page.tsx');
    assert.doesNotMatch(passportSource, /Теги классификации/);
    assert.doesNotMatch(passportSource, /Дополнительные параметры/);
    assert.doesNotMatch(passportSource, /Дополнительные характеристики/);
  });

  it('getEquipmentFieldValue helper resolves both base model attributes and customFields transparently', () => {
    const { getEquipmentFieldValue } = require('../eps-helpers');
    const sample = {
      name: 'Пресс КД-2126',
      inventoryNumber: 'INV-999',
      serialNumber: 'SN-001',
      manufacturer: 'Савеловский МЗ',
      model: 'КД-2126',
      location: 'Цех 5',
      status: 'ACTIVE',
      customFields: {
        decimal_number: '710.02.00',
        criticality: 'A',
      },
    };

    assert.strictEqual(getEquipmentFieldValue(sample, 'name'), 'Пресс КД-2126');
    assert.strictEqual(getEquipmentFieldValue(sample, 'inventoryNumber'), 'INV-999');
    assert.strictEqual(getEquipmentFieldValue(sample, 'manufacturer'), 'Савеловский МЗ');
    assert.strictEqual(getEquipmentFieldValue(sample, 'model'), 'КД-2126');
    assert.strictEqual(getEquipmentFieldValue(sample, 'decimal_number'), '710.02.00');
    assert.strictEqual(getEquipmentFieldValue(sample, 'criticality'), 'A');
  });

  it('Admin module settings provides DATABASE_EQUIPMENT_FIELD_OPTIONS for binding section fields to database columns', () => {
    const adminSource = readProjectFile('apps/web/src/app/admin/module-settings/page.tsx');
    assert.match(adminSource, /DATABASE_EQUIPMENT_FIELD_OPTIONS/);
    assert.match(adminSource, /Привязать к полю позиции из базы данных/);

    const { DATABASE_EQUIPMENT_FIELD_OPTIONS } = require('../eps-database-fields');
    assert.ok(Array.isArray(DATABASE_EQUIPMENT_FIELD_OPTIONS));
    assert.ok(DATABASE_EQUIPMENT_FIELD_OPTIONS.length >= 25);
    assert.ok(DATABASE_EQUIPMENT_FIELD_OPTIONS.some((o: any) => o.key === 'inventoryNumber'));
    assert.ok(DATABASE_EQUIPMENT_FIELD_OPTIONS.some((o: any) => o.key === 'manufacturer'));
    assert.ok(DATABASE_EQUIPMENT_FIELD_OPTIONS.some((o: any) => o.key === 'is_critical_path'));
  });

  it('Equipment wizard form (/eps/new) removes tags and labels step', () => {
    const wizardSource = readProjectFile('apps/web/src/components/eps/EquipmentWizardForm.tsx');
    assert.doesNotMatch(wizardSource, /Метки и теги оборудования/);
  });
});
