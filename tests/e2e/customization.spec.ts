import { expect, test } from '@playwright/test';

test('layout customization survives a reload', async ({ page }) => {
  await page.goto('/');

  // Default layout renders.
  await expect(page.getByRole('heading', { name: 'Comfort' })).toBeVisible();

  await page.getByRole('button', { name: /edit dashboard/i }).click();

  // Remove a default card and add one that isn't shown by default.
  await page.getByRole('button', { name: /remove comfort from the dashboard/i }).click();
  await expect(page.getByRole('heading', { name: 'Comfort' })).toHaveCount(0);

  await page.getByRole('button', { name: /add a card/i }).click();
  await page.getByRole('button', { name: /add wind/i }).click();
  await expect(page.getByRole('heading', { name: 'Wind' })).toBeVisible();

  await page.getByRole('button', { name: /done editing/i }).click();

  // The real test: preferences persist across a full page load.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Wind' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comfort' })).toHaveCount(0);

  // Edit mode is transient and must not come back after a reload.
  await expect(page.getByRole('button', { name: /edit dashboard/i })).toHaveAttribute('aria-pressed', 'false');
});

test('cards can be reordered by keyboard alone, with no dragging', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /edit dashboard/i }).click();

  const headingsBefore = await page.getByRole('heading', { level: 2 }).allTextContents();

  // Move the second card earlier using its button — no pointer drag involved.
  await page.getByRole('button', { name: /^move comfort earlier$/i }).click();

  const headingsAfter = await page.getByRole('heading', { level: 2 }).allTextContents();
  expect(headingsAfter).not.toEqual(headingsBefore);
  expect(headingsAfter[0]).toBe('Comfort');

  await page.reload();
  const headingsAfterReload = await page.getByRole('heading', { level: 2 }).allTextContents();
  expect(headingsAfterReload[0]).toBe('Comfort');
});
