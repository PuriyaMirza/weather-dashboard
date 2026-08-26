import { expect, test, type Page } from '@playwright/test';

/**
 * The radio itself is visually hidden inside its label, so a real user clicks the label. Doing the
 * same here also proves the label/input association is correct — which is the property that makes
 * the control usable at all.
 */
function themeOption(page: Page, name: RegExp) {
  return page.getByRole('radio', { name }).locator('xpath=ancestor::label[1]');
}

test('theme choice applies and survives a reload with no flash of the wrong theme', async ({ page }) => {
  await page.goto('/');

  const html = page.locator('html');
  // "Auto" is the default and deliberately sets no attribute, letting CSS follow the OS.
  await expect(html).not.toHaveAttribute('data-theme', /.*/);

  await themeOption(page, /always use the dark theme/i).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // The pre-paint script must apply this before React hydrates, or dark-mode users see a white flash.
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('radio', { name: /always use the dark theme/i })).toBeChecked();

  await themeOption(page, /match my system/i).click();
  await expect(html).not.toHaveAttribute('data-theme', /.*/);
});

test('dark theme actually recolours the page, not just the attribute', async ({ page }) => {
  await page.goto('/');
  const lightBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await themeOption(page, /always use the dark theme/i).click();
  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  expect(darkBackground).not.toBe(lightBackground);
});

test('locations can be saved and switched between', async ({ page }) => {
  await page.goto('/');

  // Portland is the default and starts unsaved.
  await page.getByRole('button', { name: /save portland/i }).click();
  await expect(page.getByRole('button', { name: /show weather for portland/i })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /show weather for portland/i })).toBeVisible();

  await page.getByRole('button', { name: /remove portland.*from saved locations/i }).click();
  await expect(page.getByRole('button', { name: /show weather for portland/i })).toHaveCount(0);
});

test('a layout preset replaces the dashboard in one click', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /edit dashboard/i }).click();

  await page.getByRole('button', { name: /use the cyclist layout/i }).click();

  // The Cyclist preset leads with wind and air quality.
  await expect(page.getByRole('heading', { name: 'Wind' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Air Quality' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Wind' })).toBeVisible();
});
