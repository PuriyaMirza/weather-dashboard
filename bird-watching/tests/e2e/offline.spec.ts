import { expect, test } from '@playwright/test';

// Every other spec blocks service workers so page.route stubs see every request.
test.use({ serviceWorkers: 'allow' });

test('the guide and the log open with no connection once the app has been visited', async ({ page, context }) => {
  // The worker registers only in production builds (see service-worker-registrar.tsx), so this
  // runs against `npm run start` — CI, or locally with CI=1 after `npm run build`.
  test.skip(!process.env.CI, 'service worker only registers in a production build');
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Install precaches in the background; wait until the shell pages are in Cache Storage.
  await expect
    .poll(() => page.evaluate(async () => (await caches.match('/log')) !== undefined && (await caches.match('/guide')) !== undefined))
    .toBe(true);

  // setOffline alone doesn't reach the worker's own fetches in Chromium; failing every request at
  // the context does, so a pass here means the pages really came from Cache Storage.
  await context.route('**/*', (route) => route.abort('internetdisconnected'));
  await context.setOffline(true);

  await page.goto('/guide');
  await page.getByLabel('Search birds').fill('AMRO');
  await expect(page.getByText('1 bird matches')).toBeVisible();

  // Never opened online: a plain offline notice, not some other page's content under this URL.
  await page.goto('/guide/amerob');
  await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible();

  await page.goto('/log');
  await page.getByRole('button', { name: 'Start an outing' }).click();
  await expect(page).toHaveURL(/\/log\/outing\?id=/);
  await page.getByLabel('Add a bird').fill('NOCA');
  await page.getByLabel('Add a bird').press('Enter');
  await expect(page.getByText(/1 species, 1 birds? counted/)).toBeVisible();
});

test('the manifest makes the app installable', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ short_name: 'Birding', display: 'standalone', start_url: '/' });
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
});
