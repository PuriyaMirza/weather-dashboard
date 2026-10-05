import { expect, test, type Page } from '@playwright/test';
import { LISBON, PORTLAND, markOnboarded, stubWeatherByLatitude } from './support';

test.beforeEach(async ({ page }) => {
  await markOnboarded(page, { location: PORTLAND, savedLocations: [PORTLAND, LISBON] });
  await stubWeatherByLatitude(page);
});

function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function openCompareWithLisbon(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /^compare$/i }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Compare' })).toBeFocused();
  await page.getByRole('button', { name: /compare with lisbon/i }).click();
  await expect(page.getByRole('article', { name: 'Lisbon' })).toContainText('80°');
}

test('compares a saved place by day, then side by side, and remembers the pair', async ({ page }) => {
  await openCompareWithLisbon(page);

  // The grid is gone; both places are showing right now, with the gap said in words.
  await expect(page.getByLabel('Weather modules')).toHaveCount(0);
  await expect(page.getByRole('article', { name: 'Portland' })).toContainText('72°');
  await expect(page.getByText('Lisbon is 8° warmer than Portland right now.')).toBeVisible();

  // By day: four dates, because Lisbon is a calendar day ahead of Portland.
  const byDay = page.getByRole('table', { name: /by day for portland and lisbon/i });
  await expect(byDay.getByRole('rowheader')).toHaveText(['Today', 'Tomorrow', 'Mon', 'Tue']);
  await expect(byDay.getByRole('row').nth(2)).toContainText('No forecast for Lisbon today');

  const layouts = page.getByRole('group', { name: '7-day forecast' });
  await layouts.getByRole('radio', { name: 'Side by side' }).locator('xpath=ancestor::label[1]').click();
  await expect(page.getByRole('table', { name: '7-day forecast for Portland' })).toBeVisible();
  await expect(page.getByRole('table', { name: '7-day forecast for Lisbon' })).toBeVisible();
  await expect(byDay).toHaveCount(0);

  // The view itself is not remembered across a reload; the pair and the layout are.
  await page.reload();
  await expect(page.getByLabel('Weather modules')).toBeVisible();
  await page.getByRole('button', { name: /^compare$/i }).click();
  await expect(page.getByRole('article', { name: 'Lisbon' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Side by side' })).toBeChecked();
  await expect(page.getByRole('table', { name: '7-day forecast for Lisbon' })).toBeVisible();
});

test('Done and Escape both return to the dashboard with focus on the Compare button', async ({ page }) => {
  await openCompareWithLisbon(page);
  const compareButton = page.getByRole('button', { name: /^compare$/i });

  await page.getByRole('button', { name: /^done$/i }).click();
  await expect(page.getByLabel('Weather modules')).toBeVisible();
  await expect(compareButton).toBeFocused();

  await compareButton.press('Enter');
  await expect(page.getByRole('heading', { level: 2, name: 'Compare' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Weather modules')).toBeVisible();
  await expect(compareButton).toBeFocused();
});

test('the picker leaves the main place out and returns focus when closed', async ({ page }) => {
  await openCompareWithLisbon(page);
  const change = page.getByRole('button', { name: /^change compared place/i });

  await change.click();
  const dialog = page.getByRole('dialog', { name: 'Compare with…' });
  await expect(dialog.getByRole('button', { name: /compare with lisbon/i })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /compare with portland/i })).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(change).toBeFocused();
  // Escape went to the dialog, not to the view behind it.
  await expect(page.getByRole('heading', { level: 2, name: 'Compare' })).toBeVisible();
});

test('nothing scrolls sideways on a 360px phone, in either layout', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await openCompareWithLisbon(page);

  await expect(page.getByRole('table', { name: /by day/i })).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await page.getByRole('radio', { name: 'Side by side' }).locator('xpath=ancestor::label[1]').click();
  await expect(page.getByRole('table', { name: '7-day forecast for Lisbon' })).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});
