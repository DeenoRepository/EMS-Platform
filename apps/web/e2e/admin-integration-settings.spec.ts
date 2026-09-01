import { test, expect } from './fixtures';

test.describe('SRM integration settings', () => {
  test('opens settings and integration configuration without a client error', async ({ adminPage }) => {
    const response = await adminPage.goto('/admin/settings');
    expect(response?.status()).toBe(200);
    await expect(adminPage.locator('body')).not.toContainText('Unhandled Runtime Error');
  });

  test('opens module settings without a client error', async ({ adminPage }) => {
    const response = await adminPage.goto('/admin/module-settings');
    expect(response?.status()).toBe(200);
    await expect(adminPage.locator('body')).not.toContainText('Unhandled Runtime Error');
  });
});
