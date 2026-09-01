import { test, expect } from './fixtures';
import { ModulePage } from './pages';

test.describe('critical authenticated page smoke', () => {
  const routes = [
    ['/eps', 'Реестр технологического оборудования'],
    ['/wms', 'Панель материальных потоков и остатков (WMS)'],
    ['/mro', 'График ППР и наряды на ТО'],
  ] as const;

  for (const [route, heading] of routes) {
    test(`renders ${route} for an authenticated administrator`, async ({ adminPage }) => {
      const errors: string[] = [];
      adminPage.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('500')) errors.push(message.text());
      });

      const response = await adminPage.goto(route);
      expect(response?.status()).toBe(200);
      await expect(adminPage.getByRole('heading', { name: heading })).toBeVisible();
      await new ModulePage(adminPage).expectHealthyPage();
      expect(errors).toEqual([]);
    });
  }
});

test.describe('critical RBAC boundaries', () => {
  test('guest cannot see the equipment registry content', async ({ guestPage }) => {
    await guestPage.goto('/eps');
    await expect(guestPage.getByText('Доступ ограничен')).toBeVisible();
    await expect(guestPage.getByText(/нет полномочий для просмотра реестра/i)).toBeVisible();
  });
});
