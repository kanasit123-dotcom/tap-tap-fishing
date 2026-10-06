import { defineConfig, devices } from '@playwright/test';
// E2E_SNAPSHOT=1 (npm run test:e2e:snapshot): test a frozen copy in .e2e-snapshot/ on port 5195, so edits to the
// working tree during a long run do not reload the page under test.
const snapshot = Boolean(process.env.E2E_SNAPSHOT);
const port = snapshot ? 5195 : 5193;
export default defineConfig({
  testDir: snapshot ? './.e2e-snapshot/tests/e2e' : './tests/e2e', fullyParallel: false, workers: 1,
  use: { baseURL: `http://127.0.0.1:${port}`, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { ...devices['iPad (gen 7)'], defaultBrowserType: 'chromium' } },
    { name: 'phone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'webkit-tablet', timeout: 60_000,
      grep: /rapid touches|deep catch|touch taps|creatures enter|keyboard controls|real hook collision|looks keep answering/,
      use: { ...devices['iPad (gen 7)'], defaultBrowserType: 'webkit' } },
  ],
  webServer: snapshot
    ? { command: 'npx vite .e2e-snapshot --host 127.0.0.1 --port 5195 --strictPort', url: 'http://127.0.0.1:5195', reuseExistingServer: false }
    : { command: 'npm run dev -- --port 5193 --strictPort', url: 'http://127.0.0.1:5193', reuseExistingServer: !process.env.CI },
});
