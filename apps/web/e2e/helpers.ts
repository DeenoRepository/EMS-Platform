import { Page } from '@playwright/test';

let nextClientId = 1;

/**
 * Logs in via the real login form (not a cookie shortcut) so every smoke
 * test exercises the actual auth flow, matching L4's "вход в систему"
 * acceptance criterion.
 */
export async function login(page: Page, username: string, password: string): Promise<void> {
  // The login and setup-status endpoints are intentionally rate-limited per IP.
  // Playwright runs the whole serial suite through one local address, so give
  // each browser context a deterministic synthetic client IP before the first
  // navigation. Nginx supplies this trusted proxy header in production.
  const clientId = nextClientId++;
  const thirdOctet = Math.floor(clientId / 250);
  const fourthOctet = (clientId % 250) + 1;
  await page.context().setExtraHTTPHeaders({
    'x-forwarded-for': `198.51.${thirdOctet}.${fourthOctet}`,
  });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  if (!page.url().endsWith('/login')) return;
  await page.getByLabel('Корпоративный логин (LDAP)').fill(username);
  // getByLabel('Пароль') is ambiguous: it also matches the MUI "show
  // password" IconButton (aria-label="Показать пароль" contains "Пароль").
  // Scope to the actual password textbox by its input id instead.
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Войти в систему' }).click();
  await page.waitForURL('/', { timeout: 10_000 });
}
