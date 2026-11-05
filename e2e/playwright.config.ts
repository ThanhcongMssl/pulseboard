import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against a running stack: `pnpm dev` locally, or the
// docker compose stack in CI. Every test opens a fresh browser context, so it
// gets a new anonymous client id and the default layout.
export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.e2e.ts',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // One stack, one dataset: tests run in order rather than racing each other.
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'dashboard',
      testIgnore: '**/live.e2e.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    // Last: it rebuilds a day of reports, which would refetch data under the others.
    {
      name: 'live',
      testMatch: '**/live.e2e.ts',
      dependencies: ['dashboard'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
});
