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
