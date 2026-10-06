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

async function stubApis(page: Page) {
  await page.route('**/api/forecast', (route) => route.fulfill({ json: forecast }));
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
