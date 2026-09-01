import { test, expect } from './fixtures';

test.describe('SRM to MRO handoff', () => {
  test('opens SRM issue registry and MRO schedule views', async ({ adminPage }) => {
    const srmResponse = await adminPage.goto('/srm');
    expect(srmResponse?.status()).toBe(200);
    await expect(adminPage.locator('body')).not.toContainText('Unhandled Runtime Error');

    const mroResponse = await adminPage.goto('/mro');
    expect(mroResponse?.status()).toBe(200);
    await expect(adminPage.getByRole('heading', { name: 'График ППР и наряды на ТО' })).toBeVisible();
  });
});
