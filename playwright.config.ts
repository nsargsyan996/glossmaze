import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real web build.
 * First run: `npx playwright install chromium`, then `npm run test:e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['iPhone 13'],
    browserName: 'chromium',
    // Use a locally installed Chrome instead of Playwright's download, if set.
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  webServer: {
    command: 'npx expo export --platform web --output-dir dist-web && npx serve dist-web -l 4173 --no-clipboard',
    url: 'http://localhost:4173',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
