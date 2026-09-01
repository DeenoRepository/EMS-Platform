import { expect, type Page } from '@playwright/test';

export class EpsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/eps');
    await expect(this.page.getByRole('heading', { name: 'Реестр технологического оборудования' })).toBeVisible();
  }

  async expectCreateWizardAction(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /создать|добавить оборудование/i }).first()).toBeVisible();
  }
}
