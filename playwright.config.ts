import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: {
    // Must match the dev server's own origin. Next.js blocks cross-origin requests for dev
    // resources, so hitting 127.0.0.1 while the server considers itself localhost silently blocks
    // the client JS bundle — the page server-renders but never hydrates.
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
