import { defineConfig, devices } from '@playwright/test';

// In CI the suite runs against the production build, so it exercises the artifact that actually
// ships rather than the dev server. Locally `npm run dev` stays the faster feedback loop.
const isCI = Boolean(process.env.CI);

// Escape hatch for environments that ship their own Chromium (and forbid downloading one). Applied
// per project rather than globally: set on every project it would hand the WebKit one a Chromium
// binary to launch.
const chromiumBinary = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
  : {};

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
  },
  webServer: {
    command: isCI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...chromiumBinary },
    },
    // The grid drops to two columns on a phone and the arrange controls live at their most
    // cramped there, but every spec until now ran at 1280px — which is how a drag handle nothing
    // could grab survived this long. Scoped with `testMatch` rather than run wholesale: the rest
    // of the suite has nothing width-dependent to say, and CI minutes are not free.
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], ...chromiumBinary },
      testMatch: /(accessibility|customization)\.spec\.ts/,
    },
    // WebKit on Linux is not iOS Safari, but it is the same engine — and the drag bug that started
    // all of this was a WebKit behaviour Chromium structurally cannot reproduce. The tap-to-place
    // path needs no gesture, so unlike the drag it can be asserted here.
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /(accessibility|customization)\.spec\.ts/,
    },
  ],
});
