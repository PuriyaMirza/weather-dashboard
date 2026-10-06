import { expect, test } from '@playwright/test';

test('search by banding code opens the species page', async ({ page }) => {
  await page.goto('/guide');
  await page.getByLabel('Search birds').fill('AMRO');
  await expect(page.getByText('1 bird matches')).toBeVisible();
  await page.getByRole('link', { name: /American Robin/ }).click();
  await expect(page).toHaveURL(/\/guide\/amerob$/);
  await expect(page.getByRole('heading', { level: 1, name: 'American Robin' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Look-alikes' })).toBeVisible();
});

test('colour filters narrow the list and the search survives a round trip', async ({ page }) => {
  await page.goto('/guide');
  await page.locator('summary', { hasText: 'Filter by what you saw' }).click();
  await page.getByRole('button', { name: 'Yellow' }).click();
  await page.getByRole('button', { name: 'Black' }).click();
  await expect(page.getByRole('button', { name: 'Yellow' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: /American Goldfinch/ }).click();
  await page.getByRole('link', { name: 'Field guide' }).first().click();
  await expect(page.getByRole('button', { name: 'Yellow' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page.getByText(/^\d+ birds$/)).toBeVisible();
});

test('look-alikes link between species', async ({ page }) => {
  await page.goto('/guide/dowwoo');
  await page.getByRole('link', { name: 'Hairy Woodpecker' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Hairy Woodpecker' })).toBeVisible();
});

test('unknown species is a 404', async ({ page }) => {
  const response = await page.goto('/guide/notabird');
  expect(response?.status()).toBe(404);
});
