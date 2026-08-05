import { expect, test } from '@playwright/test';

test('renders the milestone 2 mock weather dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Weather Dashboard' })).toBeVisible();
  await expect(page.getByLabel('Weather cards')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Current Conditions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comfort' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hourly Temperature' })).toBeVisible();
  await expect(page.getByText('Open-Meteo integration is intentionally deferred.')).toBeVisible();
});
