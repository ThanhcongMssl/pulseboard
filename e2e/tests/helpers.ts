import { expect, type Locator, type Page } from '@playwright/test';

/** Open the dashboard (with optional URL params) and wait for the widgets to render. */
export async function openDashboard(page: Page, search = '') {
  await page.goto(`/${search}`);
  await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible();
}

/** A widget's grid cell, found by its title. */
export const widget = (page: Page, title: string | RegExp) =>
  page.locator('.react-grid-item', {
    has: page.getByRole('heading', { name: title, exact: typeof title === 'string' }),
  });

/** A KPI tile's displayed value. */
export const kpiValue = (page: Page, label: string): Locator =>
  page.getByRole('region', { name: label }).locator('p').first().locator('span').first();

/** Run a command from the palette: ⌘K, type, Enter. */
export async function runCommand(page: Page, search: string) {
  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  await page.keyboard.type(search);
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
}

/** The URL's query parameters as an object. */
export const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams);
