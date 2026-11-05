import { expect, test } from '@playwright/test';
import { openDashboard, runCommand, widget } from './helpers.ts';

test.describe('orders table', () => {
  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
    await runCommand(page, 'add all orders');
  });

  test('scrolling loads further pages while only a window of rows is rendered', async ({
    page,
  }) => {
    const orders = widget(page, 'All orders');
    const table = orders.getByRole('table');
    await expect(table.locator('[aria-rowindex="2"]')).toBeVisible();
    const total = Number(await table.getAttribute('aria-rowcount')) - 1;
    test.skip(total <= 400, 'needs more than two pages of orders');

    // The table scrolls as far as what's loaded; keep reaching the end until
    // the second page (rows 201–400) has arrived and row 300 is rendered.
    const row300 = table.locator('[aria-rowindex="300"]');
    await expect(async () => {
      await table.evaluate((el) => {
        const scroller = el.closest('.overflow-auto')!;
        scroller.scrollTop = Math.min(scroller.scrollHeight, 299 * 36);
      });
      await expect(row300).toBeAttached({ timeout: 500 });
    }).toPass({ timeout: 15_000 });
    expect(await table.locator('[role=row][aria-rowindex]').count()).toBeLessThan(80);
  });

  test('sorting by revenue goes to the server and comes back in order', async ({ page }) => {
    const orders = widget(page, 'All orders');
    await orders.getByRole('button', { name: 'Revenue' }).click(); // highest first
    await orders.getByRole('button', { name: 'Revenue' }).click(); // lowest first
    await expect(orders.getByRole('columnheader', { name: /Revenue/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await expect(orders.locator('header p')).toContainText('lowest revenue first');
    // The previous sort's rows stay (dimmed) until the server's first page arrives.
    await expect(orders.getByRole('table')).not.toHaveAttribute('aria-busy', 'true');

    const cells = orders.locator('[role=row][aria-rowindex] [role=cell]:nth-child(5)');
    await expect(cells.first()).toBeVisible();
    const values = (await cells.allTextContents()).map((t) => Number(t.replace(/[$,]/g, '')));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});
