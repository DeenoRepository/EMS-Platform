import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('EPS Standard Sections & Passport Specifications', () => {
  it('Custom sections API blocks POST, PATCH, and DELETE operations with 403 status', () => {
    const apiSource = readProjectFile('apps/web/src/app/api/eps/custom-sections/route.ts');
    assert.match(apiSource, /export async function POST/);
    assert.match(apiSource, /export async function PATCH/);
    assert.match(apiSource, /export async function DELETE/);
    assert.match(apiSource, /status:\s*403/);
    assert.match(
      apiSource,
      /Технические разделы и характеристики паспорта зафиксированы нормативным стандартом и не подлежат созданию, изменению или удалению/
    );
  });

  it('Custom fields API blocks POST and DELETE mutations with 403 status', () => {
    const apiSource = readProjectFile('apps/web/src/app/api/eps/custom-fields/route.ts');
    assert.match(apiSource, /export async function POST/);
    assert.match(apiSource, /export async function DELETE/);
    assert.match(apiSource, /status:\s*403/);
    assert.match(
      apiSource,
      /Технические разделы и характеристики паспорта зафиксированы нормативным стандартом и не подлежат созданию, изменению или удалению/
    );
  });

  it('EPS equipment registry columns correspond to all 6 technical sections and exclude tags', () => {
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

  it('Admin module settings page displays technical sections in fixed read-only standard mode without tags column', () => {
    const adminSource = readProjectFile('apps/web/src/app/admin/module-settings/page.tsx');
    // Ensure tags column is removed
    assert.doesNotMatch(adminSource, /Метки и классификаторы/);
    assert.doesNotMatch(adminSource, /Добавить метку/);
    assert.doesNotMatch(adminSource, /Создание классификатора \/ метки/);

    // Ensure section create/delete buttons are removed
    assert.doesNotMatch(adminSource, /Добавить раздел/);
    assert.doesNotMatch(adminSource, /Добавить параметр/);
    assert.doesNotMatch(adminSource, /title="Удалить раздел"/);
    assert.doesNotMatch(adminSource, /title="Редактировать раздел"/);

    // Ensure standard banner is present
    assert.match(adminSource, /Технические разделы и характеристики паспорта оборудования зафиксированы/);
  });

  it('Equipment passport page (/eps/[id]) removes classification tags table row', () => {
    const passportSource = readProjectFile('apps/web/src/app/eps/[id]/page.tsx');
    assert.doesNotMatch(passportSource, /Теги классификации/);
  });

  it('Equipment wizard form (/eps/new) removes tags and labels step', () => {
    const wizardSource = readProjectFile('apps/web/src/components/eps/EquipmentWizardForm.tsx');
    assert.doesNotMatch(wizardSource, /Метки и теги оборудования/);
  });
});
