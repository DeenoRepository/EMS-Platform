import { test, expect } from './fixtures';
import { LoginPage } from './pages';
import { E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD } from './global-setup';

test.describe('Business scenario: create equipment end-to-end', () => {
  test('admin creates a new equipment passport and it appears in the registry', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(E2E_ADMIN_LOGIN, E2E_ADMIN_PASSWORD);

    const uniqueName = `E2E Smoke Test Pump ${Date.now()}`;

    await page.goto('/eps/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Регистрация нового оборудования')).toBeVisible();

    // Step 1: Identification — the only required field is "Наименование".
    await page.getByPlaceholder('например: Центробежный насос подачи охлаждающей воды').fill(uniqueName);
    await page.getByRole('button', { name: 'Далее' }).click();

    // Step 2: Technical characteristics — skip, no required fields.
    await page.getByRole('button', { name: 'Далее' }).click();

    // Step 3: Classification and commissioning — skip, defaults are valid.
    await page.getByRole('button', { name: 'Далее' }).click();

    // Step 4: Review — submit for approval (this is the admin path, which
    // per apps/web/src/app/api/eps/equipment/route.ts still creates the
    // approval record but the equipment row exists immediately either way).
    await page.getByRole('button', { name: 'Отправить на согласование' }).click();

    // Successful creation redirects to the new equipment's passport page
    // (EquipmentWizardForm's onSuccess -> router.push(`/eps/${id}`)). The
    // name is rendered both in the breadcrumb and the page's <h1>, so scope
    // to the heading to avoid a strict-mode ambiguity.
    await page.waitForURL(/\/eps\/[a-f0-9-]+$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible();

    // Confirm it is also visible in the registry list, proving the create
    // actually persisted through the API, not just client-side state.
    await page.goto('/eps');
    await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 10_000 });
  });
});
