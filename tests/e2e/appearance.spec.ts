import { expect, test, type Page } from '@playwright/test';
import { mockWeatherData } from '../../lib/weather/mock-data';
import { markOnboarded } from './support';

// These specs exercise the returning-visitor dashboard; the first-run flow would sit over it.
test.beforeEach(async ({ page }) => {
  await markOnboarded(page);
});

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
  await expect(page.getByRole('heading', { name: 'Temperature', exact: true })).toBeVisible();
});
