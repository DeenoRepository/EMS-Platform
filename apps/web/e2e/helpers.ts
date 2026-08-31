import { Page } from '@playwright/test';

/**
 * Logs in via the real login form (not a cookie shortcut) so every smoke
 * test exercises the actual auth flow, matching L4's "вход в систему"
 * acceptance criterion.
 */
export async function login(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Корпоративный логин (LDAP)').fill(username);
  // getByLabel('Пароль') is ambiguous: it also matches the MUI "show
  // password" IconButton (aria-label="Показать пароль" contains "Пароль").
  // Scope to the actual password textbox by its input id instead.
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Войти в систему' }).click();
  await page.waitForURL('/', { timeout: 10_000 });
}
