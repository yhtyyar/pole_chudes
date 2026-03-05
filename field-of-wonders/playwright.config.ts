import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for «Поле Чудес».
 *
 * Run against local dev server by default.
 * Set BASE_URL env var to test a deployed build, e.g.:
 *   BASE_URL=https://yhtyyar.github.io/pole_chudes npx playwright test
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,       // game state is global — run serially by default
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,                 // single worker to avoid port conflicts
  reporter: [
    ['html', { outputFolder: 'e2e/playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    /* Collect trace on first retry */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    /* Enough time for animations / drum spin */
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    /* Locale set to Russian for correct Intl */
    locale: 'ru-RU',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /* Start Vite dev server automatically when running locally */
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
