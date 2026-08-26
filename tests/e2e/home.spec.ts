import { expect, test } from '@playwright/test';

test('renders the default dashboard layout with location and unit controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Weather Dashboard' })).toBeVisible();

  // Scoped to the grid: the hero carries its own screen-reader-only "Current conditions" heading,
  // so an unscoped query would match two elements.
  const grid = page.getByLabel('Weather cards');
  await expect(grid).toBeVisible();

  // The default layout is deliberately curated rather than showing all eight cards.
  await expect(grid.getByRole('heading', { name: 'Current Conditions' })).toBeVisible();
  await expect(grid.getByRole('heading', { name: 'Comfort' })).toBeVisible();
  await expect(grid.getByRole('heading', { name: 'Hourly Temperature' })).toBeVisible();
  await expect(grid.getByRole('heading', { name: 'Daily Forecast' })).toBeVisible();

  // The rest are available through the add-card drawer, not shown by default.
  await expect(grid.getByRole('heading', { name: 'Wind' })).toHaveCount(0);
  await expect(grid.getByRole('heading', { name: 'Precipitation' })).toHaveCount(0);

  // Unit preference is a radio group so the active choice is announced, not just coloured.
  await expect(page.getByRole('radio', { name: /fahrenheit/i })).toBeChecked();

  const search = page.getByRole('combobox', { name: /search for a city or postal code/i });
  await expect(search).toBeVisible();
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: /use my current location/i })).toBeVisible();

  // Attribution is a licence obligation, so it must actually render on the page.
  await expect(page.getByRole('link', { name: /open-meteo\.com/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /cc by 4\.0/i })).toBeVisible();
  await expect(page.getByText(/how your location is used/i)).toBeVisible();
});

test('every available card can be added from the drawer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /edit dashboard/i }).click();
  await page.getByRole('button', { name: /add a card/i }).click();

  const panel = page.getByRole('region', { name: /add a card/i });
  for (const name of [/add precipitation/i, /add wind/i, /add sun and uv/i, /add atmospheric details/i]) {
    await expect(panel.getByRole('button', { name })).toBeVisible();
  }
});
