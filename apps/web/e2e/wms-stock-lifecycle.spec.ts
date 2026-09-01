import { test, expect } from './fixtures';

test.describe('WMS stock lifecycle', () => {
  test('opens stock and operations surfaces for the administrator', async ({ adminPage }) => {
    const stockResponse = await adminPage.goto('/wms/stock');
    expect(stockResponse?.status()).toBe(200);
    await expect(adminPage.locator('body')).not.toContainText('Unhandled Runtime Error');

    const operationsResponse = await adminPage.goto('/wms/operations');
    expect(operationsResponse?.status()).toBe(200);
    await expect(adminPage.locator('body')).not.toContainText('Unhandled Runtime Error');
  });
});
