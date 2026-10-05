import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('EPS Equipment Database Purge Feature', () => {
  it('API route /api/eps/equipment/purge implements GET and DELETE methods restricted to admins', () => {
    const apiSource = readProjectFile('apps/web/src/app/api/eps/equipment/purge/route.ts');
    assert.match(apiSource, /export async function GET/);
    assert.match(apiSource, /export async function DELETE/);
    assert.match(apiSource, /isUserAdmin/);
    assert.match(apiSource, /roles\?\.includes\('admin'\)/);
    assert.match(apiSource, /enforceRateLimit/);
    assert.match(apiSource, /logAuditEvent/);
    assert.match(apiSource, /prisma\.\$transaction/);
    assert.match(apiSource, /tx\.equipment\.deleteMany/);
  });

  it('API purge endpoint requires confirmation word УДАЛИТЬ or DELETE', () => {
    const apiSource = readProjectFile('apps/web/src/app/api/eps/equipment/purge/route.ts');
    assert.match(apiSource, /normalizedConfirmation !== 'УДАЛИТЬ'/);
    assert.match(apiSource, /normalizedConfirmation !== 'DELETE'/);
  });

  it('EquipmentPurgeDialog component requires typing confirmation and displays stats', () => {
    const componentSource = readProjectFile('apps/web/src/components/eps/EquipmentPurgeDialog.tsx');
    assert.match(componentSource, /Удаление всех позиций оборудования/);
    assert.match(componentSource, /fetch\('\/api\/eps\/equipment\/purge'/);
    assert.match(componentSource, /confirmInput\.trim\(\)\.toUpperCase\(\) === 'УДАЛИТЬ'/);
    assert.match(componentSource, /method:\s*'DELETE'/);
  });

  it('EPS equipment registry page includes "Очистить базу" button for administrators', () => {
    const pageSource = readProjectFile('apps/web/src/app/eps/page.tsx');
    assert.match(pageSource, /EquipmentPurgeDialog/);
    assert.match(pageSource, /setOpenPurgeDialog\(true\)/);
    assert.match(pageSource, /Очистить базу/);
    assert.match(pageSource, /isAdmin &&/);
  });
});
