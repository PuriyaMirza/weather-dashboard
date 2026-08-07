import { expect, test } from '@playwright/test';

test('renders the weather dashboard shell with location search', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Weather Dashboard' })).toBeVisible();
  await expect(page.getByLabel('Weather cards')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Current Conditions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comfort' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hourly Temperature' })).toBeVisible();

  // Location controls are present and collapsed until a search is typed.
  const search = page.getByRole('combobox', { name: /search for a city or postal code/i });
  await expect(search).toBeVisible();
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: /use my current location/i })).toBeVisible();
});
