import { defineConfig, devices } from '@playwright/test';

// In CI the suite runs against the production build; locally the dev server is the faster loop.
const isCI = Boolean(process.env.CI);

// For environments that ship their own Chromium and forbid downloading one.
const chromiumBinary = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
  : {};

// Port 3100, not 3000, so this app and the weather dashboard can run side by side.
const BASE_URL = 'http://localhost:3100';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  use: {
    // Must be localhost, not 127.0.0.1: Next blocks cross-origin dev resources, so a host mismatch
    // silently stops the client bundle loading and tests only ever see server HTML.
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: isCI ? 'npm run start' : 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !isCI,
  },
  projects: [
    // Phone-first app: the primary project is a phone viewport, desktop is the secondary check.
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'], ...chromiumBinary } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...chromiumBinary }, testMatch: /accessibility\.spec\.ts/ },
  ],
});
