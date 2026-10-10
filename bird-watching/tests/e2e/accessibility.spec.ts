import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Serious and critical only, matching the weather dashboard's bar. Extend this list with every
// new page or major UI state.
const PAGES = ['/', '/guide', '/guide/amerob', '/guide/rudduc', '/guide/glossary', '/log', '/log/lists', '/log/photo', '/sightings'];

async function expectNoSeriousViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

for (const path of PAGES) {
  test(`no serious axe violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoSeriousViolations(page);
  });
}

test('no serious axe violations with guide filters open and active', async ({ page }) => {
  await page.goto('/guide');
  await page.locator('summary', { hasText: 'Filter by what you saw' }).click();
  await page.getByRole('button', { name: 'Red' }).click();
  await expectNoSeriousViolations(page);
});

test('no serious axe violations on an outing with birds and open details', async ({ page }) => {
  await page.goto('/log');
  await page.getByRole('button', { name: 'Start an outing' }).click();
  await page.getByLabel('Add a bird').fill('NOCA');
  await page.getByLabel('Add a bird').press('Enter');
  await page.getByLabel('Add a bird').fill('blu');
  await page.locator('summary', { hasText: 'Details' }).first().click();
  await expectNoSeriousViolations(page);
});

test('no serious axe violations on Today and Sightings with live data', async ({ page }) => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  await page.route('**/api/forecast', (route) =>
    route.fulfill({
      json: {
        fetchedAt: '',
        days: [
          {
            date: today,
            overnight: { windFromDeg: 200, windMph: 10, precipitationIn: 0.1 },
            outlook: { level: 'fallout-watch', headline: 'Fallout watch', reason: 'Rain may have forced migrants down.' },
            morning: { sunrise: `${today}T06:58`, sunset: `${today}T18:31`, tempLowF: 50, tempHighF: 60, maxRainChance: 40, maxWindMph: 10, windFromDeg: 200, avgCloudCover: 80 },
          },
        ],
      },
    }),
  );
  await page.route('**/api/sightings?*', (route) =>
    route.fulfill({
      json: {
        fetchedAt: '',
        days: 3,
        sightings: [
          { speciesCode: 'conwar', commonName: 'Connecticut Warbler', scientificName: 'Oporornis agilis', area: 'The Ramble', observedAt: `${today} 07:45`, count: 1, notable: true, unconfirmed: false, checklistUrl: 'https://ebird.org/checklist/S1' },
        ],
      },
    }),
  );
  await page.route('**/api/rare-highlight', (route) =>
    route.fulfill({
      json: {
        fetchedAt: '',
        highlight: {
          sighting: { speciesCode: 'conwar', commonName: 'Connecticut Warbler', scientificName: 'Oporornis agilis', area: 'The Ramble', observedAt: `${today} 07:45`, count: 1, notable: true, unconfirmed: true, checklistUrl: 'https://ebird.org/checklist/S1' },
          photo: { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/W.jpg/800px-W.jpg', width: 800, height: 600, artist: 'A. Photographer', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:W.jpg', articleUrl: 'https://en.wikipedia.org/wiki/W' },
        },
      },
    }),
  );
  // A 1×1 PNG, so the hero's image request never reaches Wikimedia.
  await page.route('**/_next/image?*', (route) =>
    route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64') }),
  );
  await page.goto('/');
  await page.getByText('Fallout watch').waitFor();
  await page.getByRole('region', { name: 'Connecticut Warbler' }).waitFor();
  await expectNoSeriousViolations(page);
  await page.goto('/sightings');
  await page.getByText('Connecticut Warbler', { exact: true }).waitFor();
  await expectNoSeriousViolations(page);
});
