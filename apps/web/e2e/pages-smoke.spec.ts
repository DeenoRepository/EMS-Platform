import { test, expect } from '@playwright/test';
import { E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD } from './global-setup';
import { login } from './helpers';
import { ModulePage } from './pages';

const ADMIN_ROUTES = [
  '/',
  '/eps',
  '/eps/new',
  '/eps/approvals',
  '/eps/documents',
  '/eps/history',
  '/eps/reports',
  '/wms',
  '/wms/stock',
  '/wms/operations',
  '/wms/inventory',
  '/wms/warehouses',
  '/mro',
  '/mro/history',
  '/mro/checklists',
  '/srm',
  '/admin/users',
  '/admin/roles',
  '/admin/settings',
  '/admin/module-settings',
  '/admin/feedback',
  '/admin/audit-log',
  '/setup',
];

test.describe('admin page smoke coverage', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD);
  });

  for (const route of ADMIN_ROUTES) {
    test(`opens ${route} without an application error`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      const response = await page.goto(route);
      expect(response?.status(), `${route} response status`).toBe(200);
      await new ModulePage(page).expectHealthyPage();
      expect(consoleErrors, `${route} console errors`).toEqual([]);
    });
  }
});
