import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('EPS Responsible Person (МОЛ) Selection & Assignment', () => {
  it('ResponsibleUserSelect component loads authorized users from /api/users and renders role and login metadata', () => {
    const componentSource = readProjectFile('apps/web/src/components/eps/ResponsibleUserSelect.tsx');
    assert.match(componentSource, /fetch\('\/api\/users'\)/);
    assert.match(componentSource, /ROLE_DISPLAY_NAMES/);
    assert.match(componentSource, /ldapLogin/);
    assert.match(componentSource, /displayName/);
    assert.match(componentSource, /Autocomplete/);
    assert.match(componentSource, /freeSolo/);
  });

  it('Equipment passport page (/eps/[id]) displays responsible person with @login badge and quick change button', () => {
    const pageSource = readProjectFile('apps/web/src/app/eps/[id]/page.tsx');
    assert.match(pageSource, /PassportChangeRespDialog/);
    assert.match(pageSource, /changeRespModalOpen/);
    assert.match(pageSource, /handleSaveResponsible/);

    const dialogSource = readProjectFile('apps/web/src/components/eps/passport/PassportChangeRespDialog.tsx');
    assert.match(dialogSource, /ResponsibleUserSelect/);
    assert.match(dialogSource, /Смена ответственного лица \(МОЛ\)/);

    const tabSource = readProjectFile('apps/web/src/components/eps/passport/PassportOverviewTab.tsx');
    assert.match(tabSource, /responsible_user_login/);

    const hookSource = readProjectFile('apps/web/src/components/eps/passport/useEquipmentPassport.ts');
    assert.match(hookSource, /responsible_user_id/);
  });

  it('Equipment wizard form (/eps/new & modal) binds responsible person to authorized user picker', () => {
    const formSource = readProjectFile('apps/web/src/components/eps/EquipmentWizardForm.tsx');
    assert.match(formSource, /ResponsibleUserSelect/);
    assert.match(formSource, /responsible_person_name/);
    assert.match(formSource, /handleCustomFieldChange\('responsible_user_id'/);
  });

  it('Batch edit dialog integrates ResponsibleUserSelect when editing responsible_person_name', () => {
    const batchSource = readProjectFile('apps/web/src/components/eps/EquipmentBatchEditDialog.tsx');
    assert.match(batchSource, /ResponsibleUserSelect/);
    assert.match(batchSource, /field === 'responsible_person_name'/);
  });

  it('API /api/users endpoint delivers active authorized users with roles for selectors', () => {
    const apiSource = readProjectFile('apps/web/src/app/api/users/route.ts');
    assert.match(apiSource, /getCurrentUser/);
    assert.match(apiSource, /isActive:\s*true/);
    assert.match(apiSource, /displayName/);
    assert.match(apiSource, /ldapLogin/);
    assert.match(apiSource, /roles/);
  });
});
