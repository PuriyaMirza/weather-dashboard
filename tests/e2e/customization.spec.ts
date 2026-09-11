import { expect, test, type Page } from '@playwright/test';
import { markOnboarded } from './support';

// These specs exercise the returning-visitor dashboard; the first-run flow would sit over it.
test.beforeEach(async ({ page }) => {
  await markOnboarded(page);
});

async function openMenu(page: Page) {
  await page.getByRole('button', { name: /open menu/i }).click();
  return page.getByRole('dialog', { name: /dashboard settings/i });
}

async function enterArrangeMode(page: Page) {
  const menu = await openMenu(page);
  await menu.getByRole('button', { name: /arrange modules/i }).click();
  await page.keyboard.press('Escape');
}

test('layout customization survives a reload', async ({ page }) => {
  await page.goto('/');

  const grid = page.getByLabel('Weather modules');
  await expect(grid.getByRole('heading', { name: 'Humidity', exact: true })).toBeVisible();

  const menu = await openMenu(page);

  // Switch off a default module and switch on one that isn't shown by default.
  await menu.getByRole('checkbox', { name: 'Humidity', exact: true }).locator('xpath=ancestor::label[1]').click();
  await expect(grid.getByRole('heading', { name: 'Humidity', exact: true })).toHaveCount(0);

  await menu.getByRole('checkbox', { name: 'Pressure', exact: true }).locator('xpath=ancestor::label[1]').click();
  await expect(grid.getByRole('heading', { name: 'Pressure', exact: true })).toBeVisible();

  await page.keyboard.press('Escape');

  // The real test: preferences persist across a full page load.
  await page.reload();
  await expect(grid.getByRole('heading', { name: 'Pressure', exact: true })).toBeVisible();
  await expect(grid.getByRole('heading', { name: 'Humidity', exact: true })).toHaveCount(0);

  // Arrange mode is transient and must not come back after a reload.
  await expect(page.getByRole('button', { name: /^move /i })).toHaveCount(0);
});

test('modules can be reordered by keyboard alone, with no dragging', async ({ page }) => {
  await page.goto('/');
  await enterArrangeMode(page);

  // Scoped to the grid: the page also has headings in the hero and the menu.
  const moduleHeadings = page.getByLabel('Weather modules').getByRole('heading', { level: 2 });
  const before = await moduleHeadings.allTextContents();

  // Move a module earlier using its button — no pointer drag involved.
  await page.getByRole('button', { name: /^move humidity earlier$/i }).click();

  const after = await moduleHeadings.allTextContents();
  expect(after).not.toEqual(before);
  expect(after.indexOf('Humidity')).toBe(before.indexOf('Humidity') - 1);

  await page.reload();
  // The grid shows a placeholder until persisted preferences rehydrate, so wait for real modules
  // before reading the order.
  await expect(page.getByLabel('Weather modules').getByRole('heading', { name: 'Humidity', exact: true })).toBeVisible();
  const afterReload = await page.getByLabel('Weather modules').getByRole('heading', { level: 2 }).allTextContents();
  expect(afterReload.indexOf('Humidity')).toBe(before.indexOf('Humidity') - 1);
});

test('a module can be resized without dragging a corner handle', async ({ page }) => {
  await page.goto('/');
  await enterArrangeMode(page);

  const group = page.getByRole('radiogroup', { name: /size of humidity/i });
  await expect(group.getByRole('radio', { name: /small humidity/i })).toBeChecked();

  await group.getByRole('radio', { name: /large humidity/i }).click();
  await expect(group.getByRole('radio', { name: /large humidity/i })).toBeChecked();

  // Size is part of the saved layout, so it has to survive a reload like everything else.
  await page.reload();
  await expect(page.getByLabel('Weather modules').getByRole('heading', { name: 'Humidity', exact: true })).toBeVisible();
  await enterArrangeMode(page);
  await expect(
    page.getByRole('radiogroup', { name: /size of humidity/i }).getByRole('radio', { name: /large humidity/i }),
  ).toBeChecked();
});
