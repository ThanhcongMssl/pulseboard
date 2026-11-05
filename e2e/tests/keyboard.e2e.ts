import { expect, test } from '@playwright/test';
import { openDashboard, params, runCommand } from './helpers.ts';

test.describe('keyboard', () => {
  test('the command palette reaches channels and campaigns by name', async ({ page }) => {
    await openDashboard(page);
    await runCommand(page, 'email');
    await expect(page).toHaveURL(/channel=email/);
    await runCommand(page, 'retargeting');
    await expect(page).toHaveURL(/campaign=fb_2/);
    expect(params(page).channel).toBe('paid_social');
  });

  test('single-key shortcuts change the view, except while typing', async ({ page }) => {
    await openDashboard(page);
    await page.keyboard.press('1');
    await expect(page).toHaveURL(/range=7/);
    await page.keyboard.press('c');
    await expect(page).toHaveURL(/range=7&compare=prev/);
    await page.keyboard.press('t');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Custom' }).click();
    await page.getByLabel('From', { exact: true }).focus();
    await page.keyboard.press('3');
    await expect(page).toHaveURL(/range=7/);
  });

  test('? lists the shortcuts in a dialog', async ({ page }) => {
    await openDashboard(page);
    await page.keyboard.press('Shift+?');
    const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(help).toBeVisible();
    await expect(help).toContainText('Command palette');
    await page.keyboard.press('Escape');
    await expect(help).toBeHidden();
  });
});
