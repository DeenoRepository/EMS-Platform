import { test, expect } from './fixtures';
import { LoginPage } from './pages';
import { E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD } from './global-setup';

test.describe('Login and logout', () => {
  test('logs in with valid credentials and reaches the dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD);

    // Successful login redirects away from /login to the dashboard ("/").
    await expect(page).toHaveURL('/');
  });

  test('rejects an invalid password with a visible error', async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ 'x-forwarded-for': '198.51.100.203' });
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.username.fill(E2E_ADMIN_LOGIN);
    await loginPage.password.fill('definitely-the-wrong-password');
    await loginPage.submit.click();

    await expect(page.getByRole('alert')).toBeVisible();
    // Must not have navigated away from /login on failure.
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs out and is redirected back to the login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD);

    // Open the profile menu (avatar tile in the sidebar) and log out.
    await page.getByText('E2E Admin').click();
    await page.getByRole('menuitem', { name: 'Выйти из системы' }).click();

    await expect(page).toHaveURL(/\/login/);
  });
});
