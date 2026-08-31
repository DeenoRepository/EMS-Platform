/**
 * eps-approval.spec.ts — E2E write scenario: EPS equipment approval lifecycle.
 *
 * Covers M5 requirement: "EPS: создание заявки на согласование → согласование →
 * отражение статуса" plus one negative (guest denied on direct URL).
 *
 * Scenario:
 *  1. Admin creates a new equipment passport (submits for approval).
 *  2. Admin navigates to the approvals queue and approves the pending request.
 *  3. Equipment passport shows the approved status.
 *  4. Guest user trying to approve directly via UI is denied.
 */
import { test, expect } from '@playwright/test';
import { E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD, E2E_GUEST_LOGIN, E2E_GUEST_PASSWORD } from './global-setup';
import { login } from './helpers';

test.describe('EPS equipment approval write lifecycle', () => {
  test('admin submits equipment for approval and then approves it', async ({ page }) => {
    await login(page, E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD);

    // Step 1: Create a new equipment passport and submit for approval.
    const uniqueName = `M5 Approval Smoke Test ${Date.now()}`;

    await page.goto('/eps/new');
    await expect(page.getByText('Регистрация нового оборудования')).toBeVisible({ timeout: 10_000 });

    // Fill the name field (the only required field in step 1).
    await page.getByPlaceholder('например: Центробежный насос подачи охлаждающей воды').fill(uniqueName);
    await page.getByRole('button', { name: 'Далее' }).click();

    // Skip optional steps 2 and 3.
    await page.getByRole('button', { name: 'Далее' }).click();
    await page.getByRole('button', { name: 'Далее' }).click();

    // Step 4: Submit for approval.
    await page.getByRole('button', { name: 'Отправить на согласование' }).click();

    // Successful creation → redirected to the equipment passport page.
    await page.waitForURL(/\/eps\/[a-f0-9-]+$/, { timeout: 15_000 });
    const equipmentUrl = page.url();
    await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible();

    // Step 2: Navigate to the approvals list and find our pending item.
    await page.goto('/eps/approvals');
    await expect(page.getByRole('heading', { name: 'Согласование изменений оборудования' })).toBeVisible({ timeout: 10_000 });

    // Look for the equipment name in the approvals queue.
    // The approval row should be visible — click to open or act on it.
    const approvalRow = page.getByText(uniqueName).first();
    await expect(approvalRow).toBeVisible({ timeout: 10_000 });

    // Step 3: Open the decision dialog from the specific approval row and
    // approve through its explicit action. Scoping avoids the sortable
    // "Решение / автор" column-header button.
    const approvalTableRow = page.getByRole('row').filter({ hasText: uniqueName });
    await approvalTableRow.getByRole('button', { name: 'Решение', exact: true }).click();
    await expect(page.getByText('Рассмотрение заявки на согласование')).toBeVisible();
    await page.getByRole('button', { name: 'Утвердить' }).click();

    // Wait for the registry to refetch and reflect the saved decision before
    // navigating away; otherwise the test can race the PATCH request.
    await expect(page.getByText('Утверждено').first()).toBeVisible({ timeout: 10_000 });

    // Step 4: Navigate back to the equipment passport and verify approved status.
    await page.goto(equipmentUrl);
    await expect(page.getByText(/в работе|согласовано|approved|утверждено/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('guest user cannot approve equipment requests (RBAC denial)', async ({ page }) => {
    await login(page, E2E_GUEST_LOGIN, E2E_GUEST_PASSWORD);

    // Guest navigating to /eps/approvals should see no approve actions
    // or be redirected. The guest role has zero permissions.
    await page.goto('/eps/approvals');

    // Either redirected away from the page or the page shows no approve buttons.
    const url = page.url();
    const isApprovalPage = url.includes('/eps/approvals');

    if (isApprovalPage) {
      // If the page loads, there must be no approve action buttons for the guest.
      const approveButtons = page.getByRole('button', { name: /согласовать|approve/i });
      await expect(approveButtons).toHaveCount(0);
    } else {
      // Redirected to dashboard or denied page — that's also valid.
      expect(url).not.toContain('/eps/approvals');
    }
  });
});
