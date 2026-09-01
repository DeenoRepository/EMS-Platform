import { test, expect } from './fixtures';

test.describe('WMS inventory entry flow', () => {
  test('opens inventory registry and exposes create-inventory action', async ({ adminPage }) => {
    const response = await adminPage.goto('/wms/inventory');
    expect(response?.status()).toBe(200);
    await expect(adminPage.getByRole('heading', { name: /инвентариза/i })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: /начать инвентаризацию|создать/i }).first()).toBeVisible();
  });

  test('opens a known inventory detail route without a client error', async ({ adminPage }) => {
    const response = await adminPage.goto('/wms/inventory/e2e-missing-id');
    expect([200, 404]).toContain(response?.status());
    await expect(adminPage.locator('body')).not.toContainText('Unhandled Runtime Error');
  });
});
