import { test, expect } from '@playwright/test';
import { E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD, E2E_GUEST_LOGIN, E2E_GUEST_PASSWORD } from './global-setup';
import { login } from './helpers';

test.describe('Access to key modules (EPS, WMS, MRO)', () => {
  test('admin can open the equipment registry (EPS)', async ({ page }) => {
    await login(page, E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD);
    await page.goto('/eps');
    await expect(page.getByRole('heading', { name: 'Реестр технологического оборудования' })).toBeVisible();
  });

  test('admin can open the warehouse module (WMS)', async ({ page }) => {
    await login(page, E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD);
    await page.goto('/wms');
    await expect(page.getByRole('heading', { name: 'Панель материальных потоков и остатков (WMS)' })).toBeVisible();
  });

  test('admin can open the maintenance schedule (MRO)', async ({ page }) => {
    await login(page, E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD);
    await page.goto('/mro');
    await expect(page.getByRole('heading', { name: 'График ППР и наряды на ТО' })).toBeVisible();
  });
});

test.describe('RBAC denial for an unprivileged user', () => {
  test('guest without eps.equipment.view sees an access-denied state, not the registry', async ({ page }) => {
    await login(page, E2E_GUEST_LOGIN, E2E_GUEST_PASSWORD);
    await page.goto('/eps');

    // Guest has zero permissions (see global-setup.ts). apps/web/src/app/eps/page.tsx
    // always renders the page's <PageHeader> title, but for a user without
    // eps.equipment.view it renders an EmptyState ("Доступ ограничен")
    // instead of the equipment KPI cards / table — that EmptyState is the
    // actual RBAC-denial signal, mirroring at the E2E level what
    // packages/auth/src/rbac.test.ts already proves at the unit level for
    // hasPermission().
    await expect(page.getByText('Доступ ограничен')).toBeVisible();
    await expect(
      page.getByText('У вашей учетной записи нет полномочий для просмотра реестра и паспортов оборудования')
    ).toBeVisible();
  });

  test('guest is redirected away from the admin users page', async ({ page }) => {
    await login(page, E2E_GUEST_LOGIN, E2E_GUEST_PASSWORD);
    await page.goto('/admin/users');

    // middleware.ts redirects non-admins away from /admin/* to /eps.
    await page.waitForURL(/\/eps/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/admin/);
  });
});
