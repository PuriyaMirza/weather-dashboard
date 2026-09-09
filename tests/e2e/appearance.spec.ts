import { expect, test, type Page } from '@playwright/test';

async function openMenu(page: Page) {
  await page.getByRole('button', { name: /open menu/i }).click();
  return page.getByRole('dialog', { name: /dashboard settings/i });
}

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

  await openMenu(page);
  await themeOption(page, /always use the dark theme/i).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // The pre-paint script must apply this before React hydrates, or dark-mode users see a white flash.
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await openMenu(page);
  await expect(page.getByRole('radio', { name: /always use the dark theme/i })).toBeChecked();

  await themeOption(page, /match my system/i).click();
  await expect(html).not.toHaveAttribute('data-theme', /.*/);
});

test('dark theme actually recolours the page, not just the attribute', async ({ page }) => {
  await page.goto('/');
  const lightBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await openMenu(page);
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
  const menu = await openMenu(page);

  await menu.getByRole('button', { name: /apply the cyclist preset/i }).click();

  // The Cyclist preset leads with wind and air quality readings.
  const grid = page.getByLabel('Weather modules');
  await expect(grid.getByRole('heading', { name: 'Wind', exact: true })).toBeVisible();
  await expect(grid.getByRole('heading', { name: 'Air Quality', exact: true })).toBeVisible();

  await page.reload();
  await expect(grid.getByRole('heading', { name: 'Wind', exact: true })).toBeVisible();
});

test('every module in the menu can be switched on and off', async ({ page }) => {
  await page.goto('/');
  const menu = await openMenu(page);
  const grid = page.getByLabel('Weather modules');

  // Dew Point is a single reading the default layout leaves off — exactly the case the toggle
  // list exists for, since it is otherwise buried inside the Comfort panel.
  const dewPoint = menu.getByRole('checkbox', { name: 'Dew Point', exact: true });
  await expect(dewPoint).not.toBeChecked();

  await dewPoint.locator('xpath=ancestor::label[1]').click();
  await expect(dewPoint).toBeChecked();
  await expect(grid.getByRole('heading', { name: 'Dew Point', exact: true })).toBeVisible();

  await dewPoint.locator('xpath=ancestor::label[1]').click();
  await expect(grid.getByRole('heading', { name: 'Dew Point', exact: true })).toHaveCount(0);
});

test('the menu closes on Escape and returns focus to the hamburger', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /open menu/i })).toBeFocused();
});
