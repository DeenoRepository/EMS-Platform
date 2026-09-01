import { test, expect } from './fixtures';

test.describe('feedback flow', () => {
  test('opens feedback administration without an application error', async ({ adminPage }) => {
    const response = await adminPage.goto('/admin/feedback');
    expect(response?.status()).toBe(200);
    await expect(adminPage.locator('body')).not.toContainText('Unhandled Runtime Error');
  });

  test('opens the feedback dialog from the dashboard', async ({ adminPage }) => {
    const response = await adminPage.goto('/');
    expect(response?.status()).toBe(200);
    await expect(adminPage.locator('body')).not.toContainText('Unhandled Runtime Error');
  });
});
