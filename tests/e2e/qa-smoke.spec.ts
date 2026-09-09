import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';
import { mockWeatherData } from '../../lib/weather/mock-data';
import { ALL_CARD_IDS } from '../../lib/weather/card-layout';

/**
 * Smoke checks for things unit tests structurally cannot see.
 *
 * Every serious defect this project has shipped was found by looking at the running app, not by a
 * failing test: the hero staying light in dark mode, times rendering in the viewer's timezone, one
 * failure announced by seven separate alerts, and a page served with no stylesheet at all. The
 * suite was green each time. These tests exist to close that gap.
 */

function stubWeather(page: Page) {
  return page.route('**/api/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockWeatherData) }),
  );
}

/**
 * Collects anything the browser itself complains about. React reports hydration mismatches and
 * render errors here, and they leave no visible trace on a page that otherwise looks correct.
 */
function collectBrowserProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
  });
  return problems;
}

test('the page is actually styled, not served without its stylesheet', async ({ page }) => {
  await stubWeather(page);
  await page.goto('/');

  // A build served without its CSS still renders every element and passes any test that only
  // queries the DOM — it just looks like unstyled 1994 HTML. Asserting a real painted colour is
  // the cheapest way to catch it. Default UA backgrounds are transparent or plain white.
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
  expect(background).not.toBe('rgb(255, 255, 255)');

  // The display face is part of the design, and a failed font load is invisible to DOM queries.
  const heading = page.getByRole('heading', { name: 'Weather', exact: true });
  await expect(heading).toBeVisible();
  const font = await heading.evaluate((node) => getComputedStyle(node).fontFamily);
  expect(font.toLowerCase()).toContain('instrument');
});

test('the client bundle hydrates, so the page is interactive and not just server HTML', async ({ page }) => {
  await stubWeather(page);
  await page.goto('/');

  // Server-rendered markup alone cannot do this: the menu only opens once React has taken over.
  // This is also the check that would have caught the dev-server origin mismatch that left the
  // e2e suite silently asserting static HTML for three milestones.
  await page.getByRole('button', { name: /open menu/i }).click();
  await expect(page.getByRole('dialog', { name: /dashboard settings/i })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('loading the dashboard produces no console errors or uncaught exceptions', async ({ page }) => {
  const problems = collectBrowserProblems(page);
  await stubWeather(page);

  await page.goto('/');
  await expect(page.getByLabel('Weather modules')).toBeVisible();
  await page.getByRole('button', { name: /open menu/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  expect(problems, `browser reported problems:\n${problems.join('\n')}`).toEqual([]);
});

test('every module renders without throwing', async ({ page }) => {
  const problems = collectBrowserProblems(page);
  await stubWeather(page);

  // Seed a layout containing every module, so one bad reading cannot hide behind the curated
  // default. The readings are generated from a table, where a single bad `read()` is the
  // realistic regression.
  await page.addInitScript((ids: string[]) => {
    window.localStorage.setItem(
      'weather-dashboard',
      JSON.stringify({ state: { cards: ids.map((id) => ({ id, size: 'small' })) }, version: 5 }),
    );
  }, ALL_CARD_IDS);

  await page.goto('/');

  const grid = page.getByLabel('Weather modules');
  await expect(grid).toBeVisible();
  await expect(grid.getByRole('article')).toHaveCount(ALL_CARD_IDS.length);

  expect(problems, `browser reported problems:\n${problems.join('\n')}`).toEqual([]);
});

test('a failure is announced once, not once per module', async ({ page }) => {
  await page.route('**/api/weather*', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'The weather service is having trouble right now.' }),
    }),
  );

  await page.goto('/');

  // There is one request behind the whole dashboard. Passing its failure to every module produced
  // seven identical alerts — announced seven times by a screen reader, and a wall of red on a
  // phone. The hero owns the alert; modules show their quiet unavailable state.
  //
  // Scoped to <main>: Next injects its own empty route-announcer with role="alert" outside the
  // app's markup, and it appears once hydration settles. An unscoped count races that injection.
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
});

test('one broken module degrades to its own tile, leaving the dashboard usable', async ({ page }) => {
  // `daily` is read by the Daily Forecast module and nothing else — not the hero, not any single
  // reading — so corrupting it isolates the failure to one tile.
  //
  // A malformed *entry* rather than a malformed array: an empty object simply fails the module's
  // length guards and renders nothing, which proves less than it looks. A null row reaches the
  // render and throws on property access, which is what a real upstream-shape regression does.
  const broken = { ...mockWeatherData, daily: [null] as unknown as typeof mockWeatherData.daily };

  await page.route('**/api/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(broken) }),
  );

  await page.goto('/');

  // The broken module says so, in its own tile.
  const grid = page.getByLabel('Weather modules');
  await expect(grid.getByText(/ran into a problem/i)).toBeVisible();

  // Everything else still works. Before the boundary existed this was a blank page.
  await expect(grid.getByRole('heading', { name: 'Temperature', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /open menu/i })).toBeVisible();
  await page.getByRole('button', { name: /open menu/i }).click();
  await expect(page.getByRole('dialog', { name: /dashboard settings/i })).toBeVisible();
});

test('the hourly strip opens at the current hour, not at the start of the day', async ({ page }) => {
  // The QA suite previously checked that the page renders, hydrates and is accessible — but never
  // that the numbers on it are the right numbers. It stayed green while the hourly strip showed
  // 12am-7am at half past one in the afternoon, because the upstream array starts at local
  // midnight and the window was anchored to its first entry rather than to "now".
  const observedAt = '2026-09-09T13:30:00-04:00';
  const payload = {
    ...mockWeatherData,
    location: { ...mockWeatherData.location, timezone: 'America/New_York' },
    current: { ...mockWeatherData.current!, observedAt },
    updatedAt: observedAt,
    // What the fixed normalizer produces: the window already begins at the current hour.
    hourly: Array.from({ length: 8 }, (_, offset) => ({
      ...mockWeatherData.hourly[0],
      time: `2026-09-09T${String(13 + offset).padStart(2, '0')}:00:00-04:00`,
    })),
  };

  await page.route('**/api/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }),
  );

  await page.goto('/');

  const hero = page.locator('section[aria-labelledby="hero-heading"]');
  await expect(hero.getByText('1 PM', { exact: true })).toBeVisible();
  // The overnight hours are the signature of the old, midnight-anchored window.
  await expect(hero.getByText('12 AM', { exact: true })).toHaveCount(0);
  await expect(hero.getByText('3 AM', { exact: true })).toHaveCount(0);
});

test('the activity module states a real window, in words', async ({ page }) => {
  // Values, not just rendering — the gap that let the midnight-anchor bug ship green. A module
  // that answers a question is only useful if the answer is right, so this asserts the actual
  // window rather than merely that the tile appeared.
  const observedAt = '2026-07-18T12:00:00-07:00';
  const payload = {
    ...mockWeatherData,
    current: { ...mockWeatherData.current!, observedAt },
    updatedAt: observedAt,
    sun: { ...mockWeatherData.sun!, sunset: '2026-07-18T20:00:00-07:00' },
    // Four calm, dry, mild hours from noon: every activity should find this acceptable.
    hourly: Array.from({ length: 4 }, (_, offset) => ({
      ...mockWeatherData.hourly[0],
      time: `2026-07-18T${String(12 + offset).padStart(2, '0')}:00:00-07:00`,
      feelsLikeF: 68,
      precipitationChance: 0,
      windMph: 5,
      windGustMph: 8,
      uvIndex: 3,
    })),
  };

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'weather-dashboard',
      JSON.stringify({ state: { cards: [{ id: 'activity-windows', size: 'medium' }] }, version: 6 }),
    );
  });
  await page.route('**/api/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }),
  );

  await page.goto('/');

  const panel = page.getByRole('article', { name: /best time to go out/i });
  await expect(panel).toBeVisible();

  // The window itself, stated as times a person can act on.
  await expect(panel.getByText('12 PM – 4 PM').first()).toBeVisible();
  // And the reasoning in words, never colour alone.
  await expect(panel.getByText(/no rain expected/i).first()).toBeVisible();
});
