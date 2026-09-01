import { expect, type Page } from '@playwright/test';

export class WizardPage {
  constructor(private readonly page: Page) {}

  async expectStep(label: string): Promise<void> {
    await expect(this.page.getByText(label, { exact: true })).toBeVisible();
  }

  async expectNextDisabled(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /Далее/i })).toBeDisabled();
  }
}
