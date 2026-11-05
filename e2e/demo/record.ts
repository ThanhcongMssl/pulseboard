// Records docs/demo.gif: a scripted tour of the dashboard (rearrange a
// widget, cross-filter, compare, the command palette, a live update)
// captured as screenshots and encoded without ffmpeg. Needs the stack up
// (`pnpm dev` and a backfill) like the e2e tests: `pnpm --filter
// @pulseboard/e2e demo:gif`.
import { exec } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { chromium, type Page } from '@playwright/test';
import gifenc from 'gifenc';
import { PNG } from 'pngjs';

// gifenc is CommonJS without named ESM exports.
const { applyPalette, GIFEncoder, quantize } = gifenc;

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const BACKFILL = process.env.E2E_BACKFILL_CMD ?? 'pnpm backfill 1';
const ROOT = new URL('../..', import.meta.url);
const OUT = new URL('docs/demo.gif', ROOT);
const WIDTH = 1100;
const HEIGHT = 900;
/** Aim for about seven frames a second: smooth enough, small enough. */
const FRAME_MS = 140;

// A drawn cursor: screenshots don't include the real one.
const CURSOR = `
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l14 9-6 1.5L8 19z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none', transform: 'translate(-100px,-100px)' });
    document.body.append(c);
    addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)'; }, true);
  });`;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Move the (drawn) cursor to an element's centre, the way a person would. */
async function pointAt(page: Page, x: number, y: number) {
  await page.mouse.move(x, y, { steps: 14 });
  await pause(150);
}

async function centreOf(page: Page, locator: ReturnType<Page['locator']>) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function clickOn(page: Page, locator: ReturnType<Page['locator']>) {
  const { x, y } = await centreOf(page, locator);
  await pointAt(page, x, y);
  await page.mouse.click(x, y);
}

/** Drag with the mouse from one point to another, slowly enough to watch. */
async function dragTo(page: Page, x1: number, y1: number, x2: number, y2: number) {
  await pointAt(page, x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 30 });
  await page.mouse.up();
}

/** Drag a widget by its header; returns where the grab started and ended. */
async function dragBy(page: Page, title: string, dx: number, dy: number) {
  const handle = page
    .locator('.react-grid-item', { has: page.getByRole('heading', { name: title }) })
    .locator('.widget-drag-handle');
  const box = (await handle.boundingBox())!;
  const x = box.x + 30;
  const y = box.y + 10;
  await dragTo(page, x, y, x + dx, y + dy);
  return { start: { x, y }, end: { x: x + dx, y: y + dy } };
}

async function tour(page: Page) {
  await pause(1200);

  // Rearrange: swap the two charts. The channel mix goes left (pushing the
  // revenue chart down), then the revenue chart goes up into the free spot.
  await clickOn(page, page.getByRole('button', { name: 'Edit layout' }));
  await pause(500);
  const mix = await dragBy(page, 'Revenue by channel', -520, 20);
  await pause(600);
  const revenue = page
    .locator('.react-grid-item', { has: page.getByRole('heading', { name: /^Revenue vs/ }) })
    .locator('.widget-drag-handle');
  // Scroll so the pushed-down chart's header is in view, then drop it where
  // the channel mix started.
  const SCROLL = 240;
  await page.mouse.wheel(0, SCROLL);
  await pause(500);
  const from = (await revenue.boundingBox())!;
  await dragTo(page, from.x + 30, from.y + 10, mix.start.x, mix.start.y - SCROLL);
  await pause(500);
  await page.mouse.wheel(0, -SCROLL);
  await pause(500);
  await clickOn(page, page.getByRole('button', { name: 'Done' }));
  await pause(600);

  // Cross-filter from the legend; the KPIs count to the new numbers.
  await clickOn(
    page,
    page.getByRole('list', { name: 'Channels' }).getByRole('button', { name: 'Paid search' }),
  );
  await pause(1400);

  // Compare with the previous period.
  await clickOn(page, page.getByRole('button', { name: 'Compare' }));
  await pause(1500);

  // The command palette, down to one campaign.
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('dialog', { name: 'Command palette' }).waitFor();
  await pause(400);
  await page.keyboard.type('retarget', { delay: 90 });
  await pause(600);
  await page.keyboard.press('Enter');
  await pause(1500);

  // A live update through the whole pipeline.
  await pointAt(page, WIDTH - 200, HEIGHT - 120);
  const rebuild = promisify(exec)(BACKFILL, { cwd: ROOT });
  await page
    .getByRole('status')
    .filter({ hasText: 'Reports updated for' })
    .waitFor({ timeout: 60_000 });
  await rebuild;
  await pause(2500);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
await context.addInitScript(CURSOR);
const page = await context.newPage();
await page.goto(BASE);
await page.getByRole('heading', { name: 'Campaigns', exact: true }).waitFor();
await page.waitForLoadState('networkidle');

// Screenshot steadily while the tour plays.
const frames: { png: Buffer; at: number }[] = [];
let recording = true;
const recorder = (async () => {
  while (recording) {
    const started = Date.now();
    frames.push({ png: await page.screenshot(), at: started });
    await pause(Math.max(0, FRAME_MS - (Date.now() - started)));
  }
})();
await tour(page);
recording = false;
await recorder;
await browser.close();

// One palette for every frame, from a sample of them; index 255 is kept for
// "unchanged since the last frame", which is drawn transparent so each frame
// stores only what moved.
const pixels = frames.map((f) => PNG.sync.read(f.png).data);
const sample = Buffer.concat(pixels.filter((_, i) => i % 8 === 0));
const palette = quantize(sample, 255);
const TRANSPARENT = palette.length;
const gif = GIFEncoder();
let previous: Uint8Array | null = null;
pixels.forEach((rgba, i) => {
  const index = applyPalette(rgba, palette);
  const frame = Uint8Array.from(index);
  if (previous)
    for (let p = 0; p < index.length; p++) if (index[p] === previous[p]) frame[p] = TRANSPARENT;
  previous = index;
  const delay = i + 1 < frames.length ? frames[i + 1]!.at - frames[i]!.at : 2500;
  gif.writeFrame(frame, WIDTH, HEIGHT, {
    palette: i === 0 ? [...palette, [255, 0, 255]] : undefined,
    delay,
    transparent: i > 0,
    transparentIndex: TRANSPARENT,
    dispose: 1, // keep the previous frame; this one only paints what changed
  });
});
gif.finish();
writeFileSync(OUT, gif.bytes());
console.log(
  `docs/demo.gif: ${frames.length} frames, ${(gif.bytes().length / 1024 / 1024).toFixed(1)} MB`,
);
