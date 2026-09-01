import { test, expect } from './fixtures';
import { ModulePage } from './pages';

const ADMIN_ROUTES = [
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
] as const;

test.describe('admin page smoke coverage', () => {
  for (const route of ADMIN_ROUTES) {
    test(`opens ${route} without an application error`, async ({ adminPage }) => {
      const consoleErrors: string[] = [];
      adminPage.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      const response = await adminPage.goto(route);
      expect(response?.status(), `${route} response status`).toBe(200);
      await new ModulePage(adminPage).expectHealthyPage();
      expect(consoleErrors, `${route} console errors`).toEqual([]);
    });
  }
});
