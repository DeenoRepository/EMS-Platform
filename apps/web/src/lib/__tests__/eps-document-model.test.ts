import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('EPS document equipment model', () => {
  test('document API returns and searches equipment model', () => {
    const source = readProjectFile('apps/web/src/app/api/eps/documents/route.ts');
    assert.match(source, /model:\s*\{\s*contains:\s*search/);
    assert.match(source, /inventoryNumber:\s*true,\s*model:\s*true/);
  });

  test('document upload picker keeps and displays model', () => {
    const source = readProjectFile('apps/web/src/app/eps/documents/page.tsx');
    assert.match(source, /model:\s*eq\.model/);
    assert.match(source, /Модель:\s*\{doc\.equipment\.model \|\| '—'\}/);
    assert.match(source, /option\.model \? ` — \$\{option\.model\}`/);
    assert.match(source, /api\/eps\/equipment\?\$\{params\.toString\(\)\}/);
    assert.match(source, /setTimeout\(async \(\) =>/);
    assert.match(source, /options=\{uploadEquipmentOptionsWithSelected\}/);
    assert.match(source, /filterOptions=\{\(options\) => options\}/);
    assert.match(source, /inputValue=\{equipmentSearchInput\}/);
    assert.match(source, /onInputChange=\{\(_, value, reason\) =>/);
    assert.match(source, /setUploadEquipmentOptions\(\[\]\)/);
    assert.match(source, /loading=\{uploadEquipmentLoading\}/);
    assert.match(source, /option\.inventoryNumber[\s\S]*option\.name[\s\S]*option\.model/);
    assert.match(source, /Поиск по инв\. номеру, наименованию или модели/);
  });

  test('equipment document tab shows model', () => {
    const source = readProjectFile('apps/web/src/app/eps/\[id\]/page.tsx');
    assert.match(source, /Модель оборудования/);
    assert.match(source, /equipment\.model \|\| '—'/);
  });
});
