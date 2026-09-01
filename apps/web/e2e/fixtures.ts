import { test as base, expect, type Page } from '@playwright/test';
import { E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD, E2E_GUEST_LOGIN, E2E_GUEST_PASSWORD } from './global-setup';
import { login } from './helpers';

export const test = base.extend<{
  adminPage: Page;
  guestPage: Page;
}>({
  adminPage: async ({ page }, use) => {
    await login(page, E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD);
    await use(page);
  },
  guestPage: async ({ page }, use) => {
    await login(page, E2E_GUEST_LOGIN, E2E_GUEST_PASSWORD);
    await use(page);
  },
});

export { expect };
