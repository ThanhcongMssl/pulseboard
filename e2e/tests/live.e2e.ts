import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { openDashboard } from './helpers.ts';

// Rebuilds today's reports through the real pipeline (ingest, aggregate,
// Redis, /ws). Locally `pnpm backfill 1` needs the worker running; CI runs
// the backfill inside the compose stack instead.
const BACKFILL = process.env.E2E_BACKFILL_CMD ?? 'pnpm backfill 1';
const ROOT = fileURLToPath(new URL('../..', import.meta.url));

test('a rebuild of a day on screen refetches and announces itself', async ({ page }) => {
  await openDashboard(page);
  await expect(page.getByText('Live', { exact: true })).toBeVisible();

  execSync(BACKFILL, { cwd: ROOT, stdio: 'inherit' });

  const toast = page.getByRole('status').filter({ hasText: 'Reports updated for' });
  await expect(toast).toBeVisible({ timeout: 60_000 });
  await expect(toast).toContainText(/Reports updated for \w{3} \d{1,2}/);
});
