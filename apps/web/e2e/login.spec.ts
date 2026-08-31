import { test, expect } from '@playwright/test';
import { E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD } from './global-setup';

test.describe('Login and logout', () => {
  test('logs in with valid credentials and reaches the dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'EMS PLATFORM' })).toBeVisible();

    await page.getByLabel('Корпоративный логин (LDAP)').fill(E2E_ADMIN_LOGIN);
    // getByLabel('Пароль') is ambiguous: it also matches MUI's "show
    // password" IconButton (aria-label="Показать пароль"). Target the
    // password textbox by its input id instead.
    await page.locator('#password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Войти в систему' }).click();

    // Successful login redirects away from /login to the dashboard ("/").
    await page.waitForURL('/', { timeout: 10_000 });
    await expect(page).toHaveURL('/');
  });

  test('rejects an invalid password with a visible error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Корпоративный логин (LDAP)').fill(E2E_ADMIN_LOGIN);
    await page.locator('#password').fill('definitely-the-wrong-password');
    await page.getByRole('button', { name: 'Войти в систему' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    // Must not have navigated away from /login on failure.
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs out and is redirected back to the login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Корпоративный логин (LDAP)').fill(E2E_ADMIN_LOGIN);
    await page.locator('#password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Войти в систему' }).click();
    await page.waitForURL('/', { timeout: 10_000 });

    // Open the profile menu (avatar tile in the sidebar) and log out.
    await page.getByText('E2E Admin').click();
    await page.getByRole('menuitem', { name: 'Выйти из системы' }).click();

    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
