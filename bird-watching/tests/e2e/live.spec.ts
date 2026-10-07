import { expect, test, type Page } from '@playwright/test';

// The browser only talks to our routes, so stubbing them exercises the real UI with known data
// and no dependency on eBird, Open-Meteo, or an API key.
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

const forecast = {
  fetchedAt: new Date().toISOString(),
  days: [
    {
      date: today,
      overnight: { windFromDeg: 320, windMph: 12, precipitationIn: 0 },
      outlook: { level: 'high', headline: 'Good migration night', reason: 'Dry overnight NW winds at 12 mph gave fall migrants the northerly tailwind they wait for.' },
      morning: { sunrise: `${today}T06:58`, sunset: `${today}T18:31`, tempLowF: 52, tempHighF: 61, maxRainChance: 10, maxWindMph: 9, windFromDeg: 315, avgCloudCover: 20 },
    },
  ],
};

const sighting = (code: string, name: string, extra: object = {}) => ({
  speciesCode: code, commonName: name, scientificName: 'X y', area: 'The Ramble', observedAt: `${today} 07:45`,
  count: 2, notable: false, unconfirmed: false, checklistUrl: 'https://ebird.org/checklist/S1', ...extra,
});

// A 1×1 PNG, so the hero's next/image request never reaches Wikimedia.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

const rareHighlight = {
  fetchedAt: new Date().toISOString(),
  highlight: {
    sighting: sighting('bawwar', 'Black-and-white Warbler', { scientificName: 'Mniotilta varia', area: 'Evodia Field', count: 1, notable: true }),
    photo: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Mniotilta.jpg/800px-Mniotilta.jpg',
      width: 800, height: 600, artist: 'A. Photographer', license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mniotilta.jpg',
      articleUrl: 'https://en.wikipedia.org/wiki/Black-and-white_warbler',
    },
  },
};

async function stubApis(page: Page) {
  await page.route('**/api/forecast', (route) => route.fulfill({ json: forecast }));
  await page.route('**/api/rare-highlight', (route) => route.fulfill({ json: { fetchedAt: '', highlight: null } }));
  await page.route('**/api/sightings?*', (route) => {
    const days = Number(new URL(route.request().url()).searchParams.get('days'));
    return route.fulfill({
      json: {
        fetchedAt: new Date().toISOString(),
        days,
        sightings: [
          sighting('conwar', 'Connecticut Warbler', { notable: true, unconfirmed: true }),
          sighting('norcar', 'Northern Cardinal', { area: 'North Woods' }),
          ...(days >= 14 ? [sighting('blujay', 'Blue Jay')] : []),
        ],
      },
    });
  });
}

test('Today shows the migration outlook and recent park sightings', async ({ page }) => {
  await stubApis(page);
  await page.goto('/');
  await expect(page.getByText('Good migration night')).toBeVisible();
  await expect(page.getByText('6:58 AM · 6:31 PM')).toBeVisible();
  await expect(page.getByText('Connecticut Warbler', { exact: true })).toBeVisible();
  await expect(page.getByText('Rare here · unconfirmed')).toBeVisible();
});

test('Today leads with a recent rare bird and its credited photo', async ({ page }) => {
  await stubApis(page);
  await page.route('**/api/rare-highlight', (route) => route.fulfill({ json: rareHighlight }));
  await page.route('**/_next/image?*', (route) => route.fulfill({ contentType: 'image/png', body: PIXEL }));
  await page.goto('/');
  const hero = page.getByRole('region', { name: 'Black-and-white Warbler' });
  await expect(hero.getByRole('img', { name: /Black-and-white Warbler, a representative photo/ })).toBeVisible();
  await expect(hero.getByText(/Photo of the species, not this sighting: A\. Photographer/)).toBeVisible();
  await expect(hero.getByText(/Reported at Evodia Field · Today 7:45 AM/)).toBeVisible();
  await hero.getByRole('link', { name: 'Black-and-white Warbler' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Black-and-white Warbler' })).toBeVisible();
});

test('Today leaves the hero out when no rare bird can be shown', async ({ page }) => {
  await stubApis(page);
  await page.goto('/');
  await expect(page.getByText('Good migration night')).toBeVisible();
  await expect(page.getByText(/representative photo|Looking for rare birds/)).toHaveCount(0);
});

test('sightings page filters by days and area, and links to the guide', async ({ page }) => {
  await stubApis(page);
  await page.goto('/sightings');
  await expect(page.getByText('2 species reported in the last 7 days, 1 rare')).toBeVisible();
  await expect(page.getByText('New for you').first()).toBeVisible();
  await page.getByRole('button', { name: '14 days' }).click();
  await expect(page.getByText('3 species reported in the last 14 days, 1 rare')).toBeVisible();
  await page.getByLabel('Where in the park').selectOption('North Woods');
  await expect(page.getByText(/^1 species reported/)).toBeVisible();
  await page.getByRole('link', { name: 'Northern Cardinal', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Northern Cardinal' })).toBeVisible();
});

test('explains when live sightings are not configured', async ({ page }) => {
  await page.route('**/api/sightings?*', (route) =>
    route.fulfill({ status: 503, json: { error: "Live sightings aren't set up yet: the server has no eBird API key." } }),
  );
  await page.goto('/sightings');
  await expect(page.getByText(/aren't set up yet/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
});
