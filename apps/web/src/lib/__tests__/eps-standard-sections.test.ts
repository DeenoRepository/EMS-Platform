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

  it('EPS equipment registry columns correspond to technical sections and exclude tags', () => {
    const pageSource = readProjectFile('apps/web/src/app/eps/page.tsx');
    // Ensure tags column is removed
    assert.doesNotMatch(pageSource, /\{\s*id:\s*'tags'/);

    // Section 1: Classifiers
    assert.match(pageSource, /id:\s*'decimalNumber'/);
    assert.match(pageSource, /id:\s*'okofCode'/);
    assert.match(pageSource, /id:\s*'okpd2Code'/);
    assert.match(pageSource, /id:\s*'procCode'/);
    assert.match(pageSource, /id:\s*'eqGroup'/);
    assert.match(pageSource, /id:\s*'eqType'/);

    // Section 2: Condition & Wear
    assert.match(pageSource, /id:\s*'countryOrigin'/);
    assert.match(pageSource, /id:\s*'prodYear'/);
    assert.match(pageSource, /id:\s*'commYear'/);
    assert.match(pageSource, /id:\s*'equipmentAge'/);
    assert.match(pageSource, /id:\s*'actualWear'/);
    assert.match(pageSource, /id:\s*'criticality'/);
    assert.match(pageSource, /id:\s*'cleanRoom'/);
    assert.match(pageSource, /id:\s*'isUnique'/);
    assert.match(pageSource, /id:\s*'isImported'/);

    // Section 3: Maintenance & Regulations
    assert.match(pageSource, /id:\s*'maintPeriodicity'/);
    assert.match(pageSource, /id:\s*'maintScheduleYear'/);
    assert.match(pageSource, /id:\s*'toCountScheduled'/);
    assert.match(pageSource, /id:\s*'respPerson'/);
    assert.match(pageSource, /id:\s*'extSysId'/);

    // Section 4: Electrical
    assert.match(pageSource, /id:\s*'operatingVoltage'/);
    assert.match(pageSource, /id:\s*'powerKw'/);
    assert.match(pageSource, /id:\s*'nominalCurrent'/);
    assert.match(pageSource, /id:\s*'phaseCount'/);
    assert.match(pageSource, /id:\s*'upsRequired'/);

    // Section 5: Mechanics
    assert.match(pageSource, /id:\s*'operatingPressure'/);
    assert.match(pageSource, /id:\s*'coolantType'/);
    assert.match(pageSource, /id:\s*'rotationSpeed'/);

    // Section 6: Operational & Metrology
    assert.match(pageSource, /id:\s*'isCriticalPath'/);
    assert.match(pageSource, /id:\s*'calibrationInterval'/);
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
