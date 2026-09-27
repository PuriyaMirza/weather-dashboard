import { expect, test, type Page } from '@playwright/test';
import { mockWeatherData } from '../../lib/weather/mock-data';
import { markOnboarded, openLocationPanel } from './support';

// These specs exercise the returning-visitor dashboard; the first-run flow would sit over it.
test.beforeEach(async ({ page }) => {
  await markOnboarded(page);
});

async function openMenu(page: Page) {
  await page.getByRole('button', { name: /open menu/i }).click();
  return page.getByRole('dialog', { name: /dashboard settings/i });
}

test('the page renders in the Forest theme by default and keeps it across a reload', async ({ page }) => {
  await page.goto('/');

  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'forest');

  const menu = await openMenu(page);
  await expect(menu.getByRole('radio', { name: /forest/i })).toBeChecked();

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'forest');
});

test('a retired light/dark preference from an older version lands on Forest', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'weather-dashboard',
      JSON.stringify({ state: { theme: 'dark', hasOnboarded: true }, version: 8 }),
    );
  });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'forest');
  // The Forest canvas is a deep green, not the retired black or cream.
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(0, 23, 17)');
});

test('locations can be saved and switched between', async ({ page }) => {
  await page.goto('/');

  // Portland is the default and starts unsaved. Saving and the chip it produces both live behind
  // the hero's location button now.
  await openLocationPanel(page);
  await page.getByRole('button', { name: /save portland/i }).click();
  await expect(page.getByRole('button', { name: /show weather for portland/i })).toBeVisible();

  await page.reload();
  await openLocationPanel(page);
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

  // Readings is a closed accordion by default, so its checkboxes aren't reachable until opened.
  await menu.getByRole('button', { name: 'Readings', exact: true }).click();

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

test('the location dialog closes on Escape and returns focus to the location button', async ({ page }) => {
  await page.goto('/');
  await openLocationPanel(page);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /change location/i })).toBeFocused();
});

test('the menu closes on Escape and returns focus to the hamburger', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /open menu/i })).toBeFocused();
});

test('the forecast can be refreshed, and a failed refresh keeps the reading on screen', async ({ page }) => {
  let attempt = 0;
  // Both responses are stubbed rather than one being passed through: the upstream is not reachable
  // from every environment this suite runs in, and the behaviour under test is ours, not theirs.
  //
  // First load succeeds; the refresh fails. That is the case worth protecting: a transient blip
  // must not empty a dashboard that was working a second ago.
  await page.route('**/api/weather*', async (route) => {
    attempt += 1;
    if (attempt === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWeatherData),
      });
      return;
    }
    await route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'The weather service is having trouble right now.' }),
    });
  });

  await page.goto('/');

  const refresh = page.getByRole('button', { name: /^refresh$/i });
  await expect(refresh).toBeVisible();

  await refresh.click();

  await expect(page.getByText(/showing the last reading that loaded/i)).toBeVisible();
  // The grid is still there rather than replaced by errors.
  await expect(page.getByLabel('Weather modules')).toBeVisible();
});

test('a damaged saved layout does not leave the dashboard stuck loading', async ({ page }) => {
  await page.route('**/api/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockWeatherData) }));

  // Seed truncated JSON under the app's storage key before any script runs, which is what an
  // interrupted write leaves behind. The page must start as a first visit would, not hang.
  await page.addInitScript(() => {
    window.localStorage.setItem('weather-dashboard', '{"state":{"cards":[{"id":"tem');
  });

  await page.goto('/');

  await expect(page.getByLabel('Weather modules')).toBeVisible();
  await expect(page.getByText('Loading your dashboard…')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Rain Chance', exact: true })).toBeVisible();
});
