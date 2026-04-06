import { defineConfig, devices } from '@playwright/test'

const e2ePort = process.env.E2E_PORT || '4174'

/**
 * `e2e/with-server.mjs` sets E2E_PORT to a free port. Default 4174 is for manual `preview:e2e`.
 * Browsers: `PLAYWRIGHT_BROWSERS_PATH=./node_modules/.cache/ms-playwright npx playwright install chromium`
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://127.0.0.1:${e2ePort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
