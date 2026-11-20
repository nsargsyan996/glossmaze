import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real web build.
 * First run: `pnpm exec playwright install chromium`, then `pnpm test:e2e`.
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
    command: 'pnpm exec expo export --platform web --output-dir dist-web && pnpm exec serve dist-web -l 4173 --no-clipboard',
    url: 'http://localhost:4173',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
