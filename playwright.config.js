import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5193', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { ...devices['iPad (gen 7)'], defaultBrowserType: 'chromium' } },
    { name: 'phone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'webkit-tablet', timeout: 60_000,
      grep: /rapid touches|deep catch|touch taps|creatures enter|keyboard controls|real hook collision/,
      use: { ...devices['iPad (gen 7)'], defaultBrowserType: 'webkit' } },
  ],
  webServer: { command: 'npm run dev -- --port 5193 --strictPort', url: 'http://127.0.0.1:5193', reuseExistingServer: !process.env.CI },
});
