import { expect, test } from '@playwright/test';

test('renders the accessible weather dashboard placeholder', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Weather Dashboard' })).toBeVisible();
  await expect(page.getByLabel('Placeholder forecast')).toBeVisible();
  await expect(page.getByLabel('City search placeholder')).toBeVisible();
});
