import { expect, test } from '@playwright/test';
import { kpiValue, openDashboard, params, runCommand, widget } from './helpers.ts';

test.describe('interactive analysis', () => {
  test('a legend click focuses the dashboard on a channel, and back undoes it', async ({
    page,
  }) => {
    await openDashboard(page);
    const all = await kpiValue(page, 'Revenue').textContent();

    await page
      .getByRole('list', { name: 'Channels' })
      .getByRole('button', { name: 'Paid search' })
      .click();
    await expect(page).toHaveURL(/channel=paid_search/);
    await expect(kpiValue(page, 'Revenue')).not.toHaveText(all!);
    await expect(page.getByRole('navigation', { name: 'Drill-down' })).toContainText('Paid search');

    await page.goBack();
    await expect(page).not.toHaveURL(/channel=/);
    await expect(kpiValue(page, 'Revenue')).toHaveText(all!);
  });

  test('a campaign row narrows the orders to that campaign', async ({ page }) => {
    await openDashboard(page);
    await runCommand(page, 'add all orders');

    const campaigns = widget(page, 'Campaigns');
    const first = campaigns.getByRole('row').nth(1).getByRole('button');
    const name = (await first.textContent())!;
    await first.click();
    await expect(page).toHaveURL(/campaign=/);

    const orders = widget(page, 'All orders');
    await expect(orders.locator('header p')).toContainText(name);
    const cells = orders.locator('[role=row][aria-rowindex] [role=cell]:nth-child(4)');
    await expect(cells.first()).toHaveText(name);
    for (const text of await cells.allTextContents()) expect(text).toBe(name);
  });

  test('dragging across the revenue chart zooms into those days', async ({ page }) => {
    await openDashboard(page);
    const chart = widget(page, /^Revenue vs\. target/)
      .getByRole('img')
      .first();
    const box = (await chart.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();

    await expect(page).toHaveURL(/from=.*&to=/);
    const { from, to } = params(page);
    expect(from! < to!).toBe(true);
    await page.getByRole('button', { name: 'Clear custom range' }).click();
    await expect(page).not.toHaveURL(/from=/);
  });

  test('compare shows the previous period on the revenue chart', async ({ page }) => {
    await openDashboard(page, '?range=7');
    await page.getByRole('button', { name: 'Compare' }).click();
    await expect(page).toHaveURL(/compare=prev/);
    const revenue = widget(page, /^Revenue vs\. target/);
    await revenue.getByRole('button', { name: 'Table' }).click();
    await expect(revenue.getByRole('columnheader', { name: 'Previous period' })).toBeVisible();
  });
});
