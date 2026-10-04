import { expect, test, type Page } from '@playwright/test';
import { mockWeekWeatherData } from '../../lib/weather/mock-data';
import { DAY_FOLLOWING_LAYOUT, markOnboarded, openLocationPanel, seedPreferences } from './support';

// These specs exercise the returning-visitor dashboard; the first-run flow would sit over it.
test.beforeEach(async ({ page }) => {
  await markOnboarded(page);
});

test('renders the default dashboard layout with location and menu controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Weather', level: 1 })).toBeVisible();

  // Scoped to the grid: the hero carries its own screen-reader-only headings, so an unscoped
  // query would match more than one element.
  const grid = page.getByLabel('Weather modules');
  await expect(grid).toBeVisible();

  // The default layout is deliberately curated rather than showing everything available.
  // Temperature is not among them — the hero already carries the current reading.
  for (const name of ['Briefing', 'Rain Chance', 'Wind', 'Humidity', 'UV Index', 'Daily Forecast']) {
    await expect(grid.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await expect(grid.getByRole('heading', { name: 'Temperature', exact: true })).toHaveCount(0);

  // The rest are reachable through the menu, not shown by default.
  await expect(grid.getByRole('heading', { name: 'Dew Point', exact: true })).toHaveCount(0);
  await expect(grid.getByRole('heading', { name: 'Comfort', exact: true })).toHaveCount(0);

  // Changing location lives behind the hero's location button, not on the page by default.
  await expect(page.getByRole('combobox', { name: /search for a city or postal code/i })).toHaveCount(0);
  await openLocationPanel(page);
  const search = page.getByRole('combobox', { name: /search for a city or postal code/i });
  await expect(search).toBeVisible();
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: /use my current location/i })).toBeVisible();

  // Attribution is a licence obligation, so it must actually render on the page.
  await expect(page.getByRole('link', { name: /open-meteo\.com/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /cc by 4\.0/i })).toBeVisible();
  await expect(page.getByText(/how your location is used/i)).toBeVisible();
});

test('the menu offers every module, grouped into readings and panels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /open menu/i }).click();

  const menu = page.getByRole('dialog', { name: /dashboard settings/i });
  await expect(menu).toBeVisible();

  // Readings and Panels are closed accordions by default, so their checkboxes aren't in the
  // accessibility tree — and not counted — until each is opened.
  await menu.getByRole('button', { name: 'Readings', exact: true }).click();
  await menu.getByRole('button', { name: 'Panels', exact: true }).click();

  // exact, because Playwright matches accessible names by substring: several titles are prefixes
  // of others ("Temperature" / "Hourly Temperature", "Wind" / "Wind Detail").
  // Single readings — the granularity that makes "just show me dew point" possible at all.
  for (const name of ['Temperature', 'Feels Like', 'Dew Point', 'Pressure', 'Visibility', 'Cloud Cover']) {
    await expect(menu.getByRole('checkbox', { name, exact: true })).toHaveCount(1);
  }

  // Grouped panels, still available for anyone who wants the whole set at once.
  for (const name of ['Comfort', 'Hourly Temperature', 'Daily Forecast', 'Wind Detail']) {
    await expect(menu.getByRole('checkbox', { name, exact: true })).toHaveCount(1);
  }

  // Unit and theme controls live here too, rather than cluttering the header.
  await expect(menu.getByRole('radio', { name: /fahrenheit/i })).toBeChecked();
  await expect(menu.getByRole('radio', { name: /forest/i })).toBeChecked();
});

/** The fixture's today is Saturday 2026-07-18: Sunday is clear and warm, Monday rains all day. */
async function openWithWeek(page: Page, payload: unknown = mockWeekWeatherData) {
  await seedPreferences(page, { cards: DAY_FOLLOWING_LAYOUT });
  await page.route('**/api/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }),
  );
  await page.goto('/');
  return page.getByRole('group', { name: 'Plan for' });
}

test('picking a later day re-scopes the day-following modules, by pointer and by keyboard', async ({ page }) => {
  const picker = await openWithWeek(page);
  await expect(picker.getByRole('radio', { name: 'Today' })).toBeChecked();

  const hourly = page.getByRole('article', { name: /^hourly temperature/i });
  await expect(hourly).toContainText('over the next 24 hours');

  // The radio itself is visually hidden inside its chip, so click the chip, as a person would.
  await picker.getByRole('radio', { name: 'Tomorrow' }).locator('xpath=ancestor::label[1]').click();
  await expect(picker.getByRole('radio', { name: 'Tomorrow' })).toBeChecked();
  await expect(page.getByRole('article', { name: 'Hourly Temperature Sunday' })).toContainText(
    'Range 60° to 83° on Sunday.',
  );
  // The day's strip opens on its waking hours, not on midnight — scrolled there, not cut.
  const sundayStrip = page.getByRole('article', { name: 'Hourly Temperature Sunday' });
  await expect(sundayStrip.locator('[data-time="2026-07-19T06:00:00-07:00"]')).toBeInViewport();
  await expect(sundayStrip.locator('[data-time="2026-07-19T00:00:00-07:00"]')).not.toBeInViewport();
  // A reading about now does not move.
  await expect(page.getByRole('article', { name: 'Humidity', exact: true })).toContainText('54%');

  // Native radio group: the arrow keys move the choice with no script of our own.
  await picker.getByRole('radio', { name: 'Tomorrow' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(picker.getByRole('radio', { name: 'Monday' })).toBeChecked();
  await expect(page.getByRole('article', { name: 'Precipitation Monday' })).toContainText('Total, Monday');
  await expect(page.getByRole('article', { name: 'Best Time To Go Out Monday' })).toContainText(
    'No good window on Monday.',
  );
});

test('the default briefing summarises the day ahead, and follows a later day when one is picked', async ({ page }) => {
  // No seeded layout: the briefing is on the default grid, and it alone brings the picker out.
  await page.route('**/api/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockWeekWeatherData) }),
  );
  await page.goto('/');

  // Queried by role: the module header carries a decorative icon beside its title.
  const today = page.getByRole('article', { name: 'Briefing', exact: true });
  await expect(today).toContainText('Dry for the next 24 hours.');
  await expect(today).toContainText('Tomorrow: 4° warmer.');

  const picker = page.getByRole('group', { name: 'Plan for' });
  await picker.getByRole('radio', { name: 'Monday' }).locator('xpath=ancestor::label[1]').click();

  const monday = page.getByRole('article', { name: 'Briefing Monday' });
  await expect(monday).toContainText('Rain likely all day.');
  await expect(monday).toContainText('12° cooler than tomorrow.');
  await expect(monday).not.toContainText('next 24 hours');

  // Units only change how it is printed: the same Monday, in Celsius.
  await page.getByRole('button', { name: /open menu/i }).click();
  const menu = page.getByRole('dialog', { name: /dashboard settings/i });
  // The radio is visually hidden inside its segment, so click the segment, as a person would.
  await menu.getByRole('radio', { name: /celsius/i }).locator('xpath=ancestor::label[1]').click();
  await expect(menu.getByRole('radio', { name: /celsius/i })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(monday).toContainText('7° cooler than tomorrow.');
});

test('the day picker scrolls within itself on a narrow phone, never the page', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  // A full seven-day week of chips, which is more than 360px can hold.
  const daily = Array.from({ length: 7 }, (_, index) => ({
    ...mockWeekWeatherData.daily[index % mockWeekWeatherData.daily.length],
    date: `2026-07-${18 + index}`,
  }));
  const picker = await openWithWeek(page, { ...mockWeekWeatherData, daily });
  await expect(picker.getByRole('radio')).toHaveCount(7);

  // The row scrolls rather than squeezing the chips below their 44px target...
  const row = picker.locator('xpath=./div');
  expect(await row.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  const lastChip = await picker.getByRole('radio', { name: 'Friday' }).locator('xpath=ancestor::label[1]').boundingBox();
  expect(lastChip?.height).toBeGreaterThanOrEqual(44);

  // ...and the page itself never scrolls sideways.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
