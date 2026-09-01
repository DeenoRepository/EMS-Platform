import { expect, type Page } from '@playwright/test';

export class WmsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/wms');
    await expect(this.page.getByRole('heading', { name: 'Панель материальных потоков и остатков (WMS)' })).toBeVisible();
  }

  async expectOperationWizardButton(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Оформить операцию через мастер' })).toBeVisible();
  }
}
