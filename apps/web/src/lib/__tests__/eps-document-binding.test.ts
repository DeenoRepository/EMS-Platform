import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('EPS document binding by model or decimal number', () => {
  test('binding-targets API endpoint exists and returns distinct models and decimal numbers', () => {
    const source = readProjectFile('apps/web/src/app/api/eps/documents/binding-targets/route.ts');
    assert.match(source, /export async function GET/);
    assert.match(source, /modelsMap/);
    assert.match(source, /decimalsMap/);
    assert.match(source, /decimal_number/);
    assert.match(source, /decimalNumbers/);
    assert.match(source, /totalEquipmentCount/);
  });

  test('POST /api/eps/documents supports bindingMode MODEL, DECIMAL and propagate checkboxes', () => {
    const source = readProjectFile('apps/web/src/app/api/eps/documents/route.ts');
    assert.match(source, /bindingMode/);
    assert.match(source, /applyToAllModel/);
    assert.match(source, /applyToAllDecimal/);
    assert.match(source, /model:\s*\{\s*equals:\s*model/);
    assert.match(source, /decimal_number/);
    assert.match(source, /equipmentCount:\s*targetEquipments\.length/);
  });

  test('POST /api/eps/equipment/[id]/documents supports propagate by model and decimal number', () => {
    const source = readProjectFile('apps/web/src/app/api/eps/equipment/[id]/documents/route.ts');
    assert.match(source, /applyToAllModel/);
    assert.match(source, /applyToAllDecimal/);
    assert.match(source, /equipmentCount:\s*targetEquipments\.length/);
  });

  test('EPS documents page UI and API offer model and decimal binding targets', () => {
    const apiSource = readProjectFile('apps/web/src/app/api/eps/documents/route.ts');
    assert.match(apiSource, /bindingMode/);
    assert.match(apiSource, /applyToAllModel/);
    assert.match(apiSource, /applyToAllDecimal/);

    const dialogSource = readProjectFile('apps/web/src/components/eps/passport/PassportUploadDocDialog.tsx');
    assert.match(dialogSource, /applyToAllModel/);
    assert.match(dialogSource, /applyToAllDecimal/);
  });

  test('EPS equipment card documents tab offers propagate to same model or decimal number', () => {
    const pageSource = readProjectFile('apps/web/src/app/eps/\[id\]/page.tsx');
    assert.match(pageSource, /applyToAllModel/);
    assert.match(pageSource, /applyToAllDecimal/);

    const dialogSource = readProjectFile('apps/web/src/components/eps/passport/PassportUploadDocDialog.tsx');
    assert.match(dialogSource, /Привязать также ко всем единицам модели/);
  });

  test('Sync script supports matching documents by model or decimal number', () => {
    const source = readProjectFile('scripts/sync-uploaded-documents.js');
    assert.match(source, /getDecimalNumber/);
    assert.match(source, /normFileAndFolder\.includes\(normalize\(dec\)\)/);
    assert.match(source, /normFileAndFolder\.includes\(normalize\(model\)\)/);
  });
});
