import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockWeatherData, mockWeekWeatherData } from '../../lib/weather/mock-data';
import { DAY_FOLLOWING_LAYOUT, markOnboarded, openLocationPanel, seedPreferences } from './support';

// These specs exercise the returning-visitor dashboard; the first-run flow would sit over it.
test.beforeEach(async ({ page }) => {
  await markOnboarded(page);
});

/**
 * Automated accessibility scan.
 *
 * Accessibility is a build requirement here, not a cleanup pass, and until now it was verified by
 * hand — contrast ratios checked with a script, keyboard paths walked manually. Neither survives
 * being forgotten. axe runs the same checks on every state, every time.
 *
 * It is a floor, not a ceiling: axe cannot tell whether a label is *meaningful*, whether the
 * keyboard order makes sense, or whether a chart has a real text equivalent. Those still need the
 * hand-written tests alongside this one.
 */

function stubWeather(page: Page) {
  return page.route('**/api/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockWeatherData) }),
  );
}

/**
 * Serious and critical only. Minor and moderate findings are frequently stylistic or contested,
 * and a gate that cries wolf gets switched off — which is worse than no gate.
 */
async function scan(page: Page) {
  // wcag22aa carries `target-size`, which is the rule that would have caught the 24x20px drag
  // handle this suite happily passed for months.
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  return results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
}

/** Readable failure output: the rule, what it means, and which element tripped it. */
function describe(violations: Awaited<ReturnType<typeof scan>>): string {
  return violations
    .map(
      (violation) =>
        `[${violation.impact}] ${violation.id}: ${violation.help}\n` +
        violation.nodes.map((node) => `    ${node.target.join(' ')}`).join('\n'),
    )
    .join('\n\n');
}

test('the dashboard has no serious accessibility violations', async ({ page }) => {
  await stubWeather(page);
  await page.goto('/');
  await expect(page.getByLabel('Weather modules')).toBeVisible();
  // The briefing leads the default layout; waiting for its sentences means the scan covers its
  // ready state rather than a loading placeholder.
  await expect(page.getByRole('article', { name: 'Briefing' }).getByRole('listitem').first()).toBeVisible();

  const violations = await scan(page);
  expect(violations, describe(violations)).toEqual([]);
});

test('the open menu has no serious accessibility violations', async ({ page }) => {
  await stubWeather(page);
  await page.goto('/');

  await page.getByRole('button', { name: /open menu/i }).click();
  await expect(page.getByRole('dialog', { name: /dashboard settings/i })).toBeVisible();

  const violations = await scan(page);
  expect(violations, describe(violations)).toEqual([]);
});

test('the open location dialog has no serious accessibility violations', async ({ page }) => {
  await stubWeather(page);
  await page.goto('/');

  await openLocationPanel(page);
  await expect(page.getByRole('dialog', { name: /change location/i })).toBeVisible();

  const violations = await scan(page);
  expect(violations, describe(violations)).toEqual([]);
});

test('edit mode has no serious accessibility violations', async ({ page }) => {
  await stubWeather(page);
  await page.goto('/');

  await page.getByRole('button', { name: /open menu/i }).click();
  await page.getByRole('switch', { name: /arrange mode/i }).click();

  // The sticky toolbar, the per-module drag handles and size pickers, and each header's remove
  // icon only exist here, and there are a lot of them.
  await expect(page.getByRole('group', { name: /arranging modules/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^reorder /i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /remove .* from the dashboard/i }).first()).toBeVisible();

  const violations = await scan(page);
  expect(violations, describe(violations)).toEqual([]);
});

test('placement mode has no serious accessibility violations', async ({ page }) => {
  await stubWeather(page);
  await page.goto('/');

  await page.getByRole('button', { name: /open menu/i }).click();
  await page.getByRole('switch', { name: /arrange mode/i }).click();
  await page.getByRole('button', { name: /^reorder rain chance/i }).click();

  // Every other module is now a destination button laid over its reading — worth scanning, since
  // overlaying an interactive surface on existing content is exactly where contrast and naming go
  // wrong.
  await expect(page.getByText(/placing rain chance/i)).toBeVisible();

  const violations = await scan(page);
  expect(violations, describe(violations)).toEqual([]);
});

test('the failure state has no serious accessibility violations', async ({ page }) => {
  await page.route('**/api/weather*', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'The weather service is having trouble right now.' }),
    }),
  );

  await page.goto('/');
  // Scoped past Next's own empty route-announcer, which also carries role="alert".
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();

  // Error states are where contrast regressions hide: they are rarely looked at, and they use
  // colours that appear nowhere else.
  const violations = await scan(page);
  expect(violations, describe(violations)).toEqual([]);
});

test('a stormy hero has no serious accessibility violations', async ({ page }) => {
  // The default mockWeatherData condition ('partly-cloudy') has no weather-effect layer at all —
  // storm is the densest one, and the only one with a flash, so it's the one worth its own scan.
  await page.route('**/api/weather*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...mockWeatherData, current: { ...mockWeatherData.current!, condition: 'storm' } }),
    }),
  );
  await page.goto('/');
  await expect(page.getByLabel('Weather modules')).toBeVisible();

  const violations = await scan(page);
  expect(violations, describe(violations)).toEqual([]);
});

test('a later day picked for planning has no serious accessibility violations', async ({ page }) => {
  await seedPreferences(page, { cards: DAY_FOLLOWING_LAYOUT });
  await page.route('**/api/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockWeekWeatherData) }),
  );
  await page.goto('/');

  const picker = page.getByRole('group', { name: 'Plan for' });
  await picker.getByRole('radio', { name: 'Tomorrow' }).locator('xpath=ancestor::label[1]').click();

  // The chips' selected state and each module's day label are new surfaces for contrast and
  // naming, and only exist once a later day is chosen.
  await expect(page.getByRole('article', { name: 'Hourly Temperature Sunday' })).toBeVisible();

  const violations = await scan(page);
  expect(violations, describe(violations)).toEqual([]);
});

test('the default dashboard planning a later day has no serious accessibility violations', async ({ page }) => {
  // No seeded layout: the briefing on the default grid is what brings the day picker out, so this
  // is the planning state a new visitor actually reaches.
  await page.route('**/api/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockWeekWeatherData) }),
  );
  await page.goto('/');

  const picker = page.getByRole('group', { name: 'Plan for' });
  await picker.getByRole('radio', { name: 'Tomorrow' }).locator('xpath=ancestor::label[1]').click();
  await expect(page.getByRole('article', { name: 'Briefing Sunday' })).toContainText('Dry all day.');

  const violations = await scan(page);
  expect(violations, describe(violations)).toEqual([]);
});
