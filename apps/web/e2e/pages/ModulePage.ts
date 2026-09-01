import { expect, type Page } from '@playwright/test';

export class ModulePage {
  constructor(private readonly page: Page) {}

  async expectHealthyPage(): Promise<void> {
    await expect(this.page.locator('body')).not.toContainText('Application error');
    await expect(this.page.locator('body')).not.toContainText('Unhandled Runtime Error');
  }
}
