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
    const dialogSource = readProjectFile('apps/web/src/components/eps/passport/PassportUploadDocDialog.tsx');
    assert.match(dialogSource, /equipmentModel/);
    assert.match(dialogSource, /Модель оборудования/);

    const rowSource = readProjectFile('apps/web/src/components/eps/documents/DocumentTableRow.tsx');
    assert.match(rowSource, /doc\.equipment\?\.model/);
  });

  test('equipment document tab shows model', () => {
    const tabSource = readProjectFile('apps/web/src/components/eps/passport/PassportDocumentsTab.tsx');
    assert.match(tabSource, /Модель/);
    assert.match(tabSource, /equipmentModel/);
  });

  test('document upload picker searches equipment by inventory, model, decimal number, and name', () => {
    const matcherSource = readProjectFile('apps/web/src/lib/eps-document-matcher.ts');
    assert.match(matcherSource, /decimal/i);
    assert.match(matcherSource, /model/i);
    assert.match(matcherSource, /inventory/i);
  });
});
