import { test, expect } from './fixtures';

test.describe('MRO lifecycle', () => {
  test('opens maintenance schedule and history pages', async ({ adminPage }) => {
    const scheduleResponse = await adminPage.goto('/mro');
    expect(scheduleResponse?.status()).toBe(200);
    await expect(adminPage.getByRole('heading', { name: 'График ППР и наряды на ТО' })).toBeVisible();

    const historyResponse = await adminPage.goto('/mro/history');
    expect(historyResponse?.status()).toBe(200);
    await expect(adminPage.locator('body')).not.toContainText('Unhandled Runtime Error');
  });
});
