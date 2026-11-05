import { expect, test } from '@playwright/test';
import { openDashboard, widget } from './helpers.ts';

test.describe('layout builder', () => {
  test('a dragged widget stays where it was dropped after a reload', async ({ page }) => {
    await openDashboard(page);
    await page.getByRole('button', { name: 'Edit layout' }).click();

    const mix = widget(page, 'Revenue by channel');
    const before = (await mix.boundingBox())!;
    const handle = mix.locator('.widget-drag-handle');
    const grip = (await handle.boundingBox())!;
    await page.mouse.move(grip.x + 40, grip.y + 10);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) await page.mouse.move(grip.x + 40 - i * 35, grip.y + 10);
    await page.mouse.up();

    await expect.poll(async () => (await mix.boundingBox())!.x).toBeLessThan(before.x - 300);
    await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();

    await page.reload();
    await expect
      .poll(async () => (await widget(page, 'Revenue by channel').boundingBox())!.x)
      .toBeLessThan(before.x - 300);
  });

  // Between snapped grid steps the placeholder stays put, but the widget must
  // keep following the pointer (react-grid-layout 2.3.0 froze it; see the patch).
  test('a dragged or resized widget follows the pointer between grid steps', async ({ page }) => {
    await openDashboard(page);
    await page.getByRole('button', { name: 'Edit layout' }).click();
    // Measure where things are, not where they're animating to.
    await page.addStyleTag({ content: '.react-grid-item { transition: none !important; }' });
    const mix = widget(page, 'Revenue by channel');
    const placeholder = page.locator('.react-grid-placeholder');
    const box = async (l: typeof mix) => (await l.boundingBox())!;

    const grip = await box(mix.locator('.widget-drag-handle'));
    const x = grip.x + 40;
    const y = grip.y + 10;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 6, y + 6); // past the drag threshold
    const start = await box(mix);
    const snapped = await box(placeholder);
    for (const d of [8, 16, 24]) {
      await page.mouse.move(x - 6 - d, y + 6 + d);
      await expect.poll(async () => (await box(mix)).x).toBeCloseTo(start.x - d, 0);
      expect((await box(mix)).y).toBeCloseTo(start.y + d, 0);
      expect(await box(placeholder)).toEqual(snapped);
    }
    await page.mouse.up();
    await expect(placeholder).toHaveCount(0);

    const before = await box(mix);
    const corner = await box(mix.locator('.react-resizable-handle-se'));
    const cx = corner.x + corner.width / 2;
    const cy = corner.y + corner.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (const d of [8, 16, 24]) {
      await page.mouse.move(cx - d, cy + d);
      await expect.poll(async () => (await box(mix)).width).toBeCloseTo(before.width - d, 0);
      expect((await box(mix)).height).toBeCloseTo(before.height + d, 0);
    }
    await page.mouse.up();
  });

  test('keyboard moves are announced, and undo and redo walk them', async ({ page }) => {
    await openDashboard(page);
    await page.keyboard.press('e');
    const grip = page.getByRole('button', { name: 'Move Revenue by channel', exact: true });
    await grip.focus();
    // The grid eases widgets into place: read a position once it stops moving.
    const x = async () => {
      let last = (await widget(page, 'Revenue by channel').boundingBox())!.x;
      for (;;) {
        await page.waitForTimeout(100);
        const now = (await widget(page, 'Revenue by channel').boundingBox())!.x;
        if (Math.abs(now - last) < 0.5) return Math.round(now);
        last = now;
      }
    };
    const start = await x();

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('p[aria-live=polite]')).toHaveText(/Revenue by channel: column 6/);
    const moved = await x();
    expect(moved).toBeLessThan(start);

    await page.keyboard.press('ControlOrMeta+z');
    expect(await x()).toBe(start);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    expect(await x()).toBe(moved);
  });

  test('widgets come and go through the library', async ({ page }) => {
    await openDashboard(page);
    await page.getByRole('button', { name: 'Edit layout' }).click();
    await page.getByRole('button', { name: 'Remove Channels' }).click();
    await expect(page.getByRole('heading', { name: 'Channels', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Add widget' }).click();
    await page.getByRole('button', { name: /^Channels/ }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Channels', exact: true })).toBeVisible();
  });
});
