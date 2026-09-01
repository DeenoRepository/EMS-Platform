import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username = page.getByLabel('Корпоративный логин (LDAP)');
    this.password = page.locator('#password');
    this.submit = page.getByRole('button', { name: 'Войти в систему' });
  }

  async open(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading', { name: 'EMS PLATFORM' })).toBeVisible();
  }

  async login(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
    await this.page.waitForURL('/', { timeout: 10_000 });
  }
}
