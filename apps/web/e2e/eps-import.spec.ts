import { test, expect } from './fixtures';

test.describe('EPS import flow', () => {
  test('opens import-capable equipment pages without a client error', async ({ adminPage }) => {
    const response = await adminPage.goto('/eps');
    expect(response?.status()).toBe(200);
    await expect(adminPage.getByRole('heading', { name: 'Реестр технологического оборудования' })).toBeVisible();
    await expect(adminPage.locator('body')).not.toContainText('Unhandled Runtime Error');
  });

  test('opens the report import entry point', async ({ adminPage }) => {
    const response = await adminPage.goto('/eps/reports');
    expect(response?.status()).toBe(200);
    await expect(adminPage.locator('body')).not.toContainText('Unhandled Runtime Error');
  });
});
