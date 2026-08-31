/**
 * wms-transfer.spec.ts — E2E write scenario: WMS stock transfer lifecycle.
 *
 * Covers the currently implemented M5 WMS smoke scope: an administrator can
 * open the transfer-request form, while an unprivileged user cannot invoke the
 * create action. A fully seeded dispatch/receive lifecycle remains separate
 * work because the E2E fixture has no warehouses or stock rows.
 */
import { test, expect } from '@playwright/test';
import { E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD, E2E_GUEST_LOGIN, E2E_GUEST_PASSWORD } from './global-setup';
import { login } from './helpers';

test.describe('WMS stock transfer access and request form', () => {
  test('admin can open the stock transfer request form', async ({ page }) => {
    await login(page, E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD);

    // Navigate to the WMS transfers list page.
    await page.goto('/wms/transfers');
    await expect(page.getByRole('heading', { name: /перемещения|transfers/i })).toBeVisible({ timeout: 10_000 });

    // Create a new transfer request. The "Создать перемещение" button opens the form.
    await page.getByRole('button', { name: /создать перемещение/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // The E2E database intentionally has no warehouse fixture, so verify the
    // real accessible fields and disabled submit state without claiming a
    // complete transfer lifecycle.
    await expect(page.getByRole('combobox', { name: '— Выберите склад-донор —' })).toBeVisible();
    await expect(page.getByText('Склад назначения (Ваш склад):')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Направить запрос кладовщику' })).toBeDisabled();

    // Close dialog — we verified the form exists without a complete warehouse fixture.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });
  });

  test('guest user cannot access WMS transfers (RBAC denial)', async ({ page }) => {
    await login(page, E2E_GUEST_LOGIN, E2E_GUEST_PASSWORD);

    await page.goto('/wms/transfers');

    // The page shell remains visible, but privileged API calls are rejected and
    // surface a user-facing denial notification. The create action must also be
    // absent for an unprivileged user.
    await expect(page.getByText('Недостаточно прав для выполнения операции').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать перемещение' })).toHaveCount(0);
  });
});
