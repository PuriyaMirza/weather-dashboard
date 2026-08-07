import { defineConfig, devices } from '@playwright/test';

// In CI the suite runs against the production build, so it exercises the artifact that actually
// ships rather than the dev server. Locally `npm run dev` stays the faster feedback loop.
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  use: {
    // Must match the server's own origin. Next.js blocks cross-origin requests for dev resources,
    // so hitting 127.0.0.1 while the server considers itself localhost silently blocks the client
    // JS bundle — the page server-renders but never hydrates, and tests then only ever assert
    // static HTML.
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Escape hatch for environments that ship their own Chromium (and forbid downloading one).
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  webServer: {
    command: isCI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
