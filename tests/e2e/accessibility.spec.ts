import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockWeatherData } from '../../lib/weather/mock-data';
import { markOnboarded } from './support';

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
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
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

test('edit mode has no serious accessibility violations', async ({ page }) => {
  await stubWeather(page);
  await page.goto('/');

  await page.getByRole('button', { name: /open menu/i }).click();
  await page.getByRole('button', { name: /arrange modules/i }).click();
  await page.keyboard.press('Escape');

  // The per-module move, size and remove controls only exist here, and there are a lot of them.
  await expect(page.getByRole('button', { name: /^move .* earlier$/i }).first()).toBeVisible();

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
