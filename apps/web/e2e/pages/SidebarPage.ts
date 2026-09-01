import { expect, type Page } from '@playwright/test';

export class SidebarPage {
  constructor(private readonly page: Page) {}

  async expectModuleLink(name: string, href: string): Promise<void> {
    await expect(this.page.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }

  async expectModuleHidden(name: string): Promise<void> {
    await expect(this.page.getByRole('link', { name, exact: true })).toHaveCount(0);
  }
}
