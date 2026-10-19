import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('EPS Equipment Database Purge Feature', () => {
  it('API route /api/eps/equipment/purge enforces EPS_DATABASE_PURGE permission', () => {
    const apiSource = readProjectFile('apps/web/src/app/api/eps/equipment/purge/route.ts');
    assert.match(apiSource, /export async function GET/);
    assert.match(apiSource, /export async function DELETE/);
    assert.match(apiSource, /canPurgeDatabase/);
    assert.match(apiSource, /hasPermission\(user, PERMISSIONS\.EPS_DATABASE_PURGE\)/);
    assert.match(apiSource, /enforceRateLimit/);
    assert.match(apiSource, /logAuditEvent/);
    assert.match(apiSource, /prisma\.\$transaction/);
    assert.match(apiSource, /tx\.equipment\.deleteMany/);
  });

  it('Matrix includes EPS_DATABASE_PURGE code and description', () => {
    const sharedSource = readProjectFile('packages/shared/src/index.ts');
    assert.match(sharedSource, /EPS_DATABASE_PURGE:\s*'eps\.database\.purge'/);
    assert.match(sharedSource, /'eps\.database\.purge':\s*\{/);
    assert.match(sharedSource, /Очистка базы данных оборудования/);
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

  it('EPS equipment registry page includes "Очистить базу" button controlled by EPS_DATABASE_PURGE permission', () => {
    const pageSource = readProjectFile('apps/web/src/app/eps/page.tsx');
    assert.match(pageSource, /setOpenPurgeDialog\(true\)/);
    assert.match(pageSource, /hasPermission\(PERMISSIONS\.EPS_DATABASE_PURGE\)/);

    const headerSource = readProjectFile('apps/web/src/components/eps/registry/EquipmentRegistryHeader.tsx');
    assert.match(headerSource, /Очистить базу/);
    assert.match(headerSource, /canPurge &&/);

    const dialogsSource = readProjectFile('apps/web/src/components/eps/registry/EquipmentRegistryDialogs.tsx');
    assert.match(dialogsSource, /EquipmentPurgeDialog/);
  });
});
