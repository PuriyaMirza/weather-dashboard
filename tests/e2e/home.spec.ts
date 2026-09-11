import { expect, test } from '@playwright/test';
import { markOnboarded, openLocationPanel } from './support';

// These specs exercise the returning-visitor dashboard; the first-run flow would sit over it.
test.beforeEach(async ({ page }) => {
  await markOnboarded(page);
});

test('renders the default dashboard layout with location and menu controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Weather', level: 1 })).toBeVisible();

  // Scoped to the grid: the hero carries its own screen-reader-only headings, so an unscoped
  // query would match more than one element.
  const grid = page.getByLabel('Weather modules');
  await expect(grid).toBeVisible();

  // The default layout is deliberately curated rather than showing everything available.
  // Temperature is not among them — the hero already carries the current reading.
  for (const name of ['Rain Chance', 'Wind', 'Humidity', 'UV Index', 'Daily Forecast']) {
    await expect(grid.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await expect(grid.getByRole('heading', { name: 'Temperature', exact: true })).toHaveCount(0);

  // The rest are reachable through the menu, not shown by default.
  await expect(grid.getByRole('heading', { name: 'Dew Point', exact: true })).toHaveCount(0);
  await expect(grid.getByRole('heading', { name: 'Comfort', exact: true })).toHaveCount(0);

  // Changing location lives behind the hero's location button, not on the page by default.
  await expect(page.getByRole('combobox', { name: /search for a city or postal code/i })).toHaveCount(0);
  await openLocationPanel(page);
  const search = page.getByRole('combobox', { name: /search for a city or postal code/i });
  await expect(search).toBeVisible();
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: /use my current location/i })).toBeVisible();

  // Attribution is a licence obligation, so it must actually render on the page.
  await expect(page.getByRole('link', { name: /open-meteo\.com/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /cc by 4\.0/i })).toBeVisible();
  await expect(page.getByText(/how your location is used/i)).toBeVisible();
});

test('the menu offers every module, grouped into readings and panels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /open menu/i }).click();

  const menu = page.getByRole('dialog', { name: /dashboard settings/i });
  await expect(menu).toBeVisible();

  // exact, because Playwright matches accessible names by substring: several titles are prefixes
  // of others ("Temperature" / "Hourly Temperature", "Wind" / "Wind Detail").
  // Single readings — the granularity that makes "just show me dew point" possible at all.
  for (const name of ['Temperature', 'Feels Like', 'Dew Point', 'Pressure', 'Visibility', 'Cloud Cover']) {
    await expect(menu.getByRole('checkbox', { name, exact: true })).toHaveCount(1);
  }

  // Grouped panels, still available for anyone who wants the whole set at once.
  for (const name of ['Comfort', 'Hourly Temperature', 'Daily Forecast', 'Wind Detail']) {
    await expect(menu.getByRole('checkbox', { name, exact: true })).toHaveCount(1);
  }

  // Unit and appearance controls live here too, rather than cluttering the header.
  await expect(menu.getByRole('radio', { name: /fahrenheit/i })).toBeChecked();
  await expect(menu.getByRole('radio', { name: /match my system/i })).toBeChecked();
});
