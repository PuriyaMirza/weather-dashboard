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
  // The menu dismisses itself, and Escape would now exit arrange mode rather than close it.
  await expect(page.getByRole('group', { name: /arranging modules/i })).toBeVisible();
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

/**
 * A real pointer drag, which is what the arrows have been standing in for.
 *
 * `locator.dragTo()` is not usable here: it fires mousedown and a couple of moves in one tick, and
 * dnd-kit attaches its move listener inside the mousedown handler, so the 6px activation
 * constraint is never satisfied and the drag silently no-ops.
 */
test('modules can be reordered by dragging the handle', async ({ page }) => {
  await page.goto('/');
  await enterArrangeMode(page);

  const headings = page.getByLabel('Weather modules').getByRole('heading', { level: 2 });
  const before = await headings.allTextContents();

  // The first two modules, which sit side by side in the top row at every width. Picking distant
  // ones instead would put the second handle below the fold on a phone, where a pointer cannot
  // reach it.
  const from = await page.getByRole('button', { name: /^reorder rain chance/i }).boundingBox();
  const to = await page.getByRole('button', { name: /^reorder wind/i }).boundingBox();
  if (!from || !to) throw new Error('Expected both module handles to be on screen.');

  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // Intermediate steps are the point — one jump would not clear the distance constraint.
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(
      start.x + ((end.x - start.x) * step) / 12,
      start.y + ((end.y - start.y) * step) / 12,
    );
  }
  await page.mouse.up();

  await expect.poll(() => headings.allTextContents()).not.toEqual(before);

  // The real assertion: the drag wrote to the store rather than just animating.
  await page.reload();
  await expect(headings.first()).toBeVisible();
  await expect.poll(() => headings.allTextContents()).not.toEqual(before);
});

/**
 * The handle carries the CSS that makes a touch drag possible.
 *
 * This asserts the property rather than simulating the gesture, and that is deliberate. A CDP
 * touch-drag test was written first and thrown away: it passed with `touch-action` removed *and*
 * with the old PointerSensor restored, because headless Chromium never reproduces the gesture
 * contention that breaks this on a real phone. A test that cannot fail is worse than no test — it
 * reads like coverage.
 *
 * So: guard the thing that is checkable here, and verify the gesture itself by hand on iOS.
 */
test('the drag handle keeps the touch affordances a finger drag depends on', async ({ page }) => {
  await page.goto('/');
  await enterArrangeMode(page);

  const handle = page.getByRole('button', { name: /^reorder rain chance/i });

  // Without this the browser claims the gesture for scrolling before the drag can start.
  await expect(handle).toHaveCSS('touch-action', 'none');

  const box = await handle.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
});

test('arrange mode can be left without going back through the menu', async ({ page }) => {
  await page.goto('/');
  await enterArrangeMode(page);

  await page.getByRole('button', { name: /^done$/i }).click();

  await expect(page.getByRole('group', { name: /arranging modules/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^move /i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /open menu/i })).toBeFocused();
});

test('arrange mode also exits on Escape', async ({ page }) => {
  await page.goto('/');
  await enterArrangeMode(page);

  await page.keyboard.press('Escape');

  await expect(page.getByRole('group', { name: /arranging modules/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^move /i })).toHaveCount(0);
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
