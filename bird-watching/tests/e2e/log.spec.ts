import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('log an outing, count birds, export for eBird, and see the life list', async ({ page }) => {
  await page.goto('/log');
  await page.getByRole('button', { name: 'Start an outing' }).click();
  await expect(page).toHaveURL(/\/log\/outing\?id=/);

  const addBox = page.getByLabel('Add a bird');
  await addBox.fill('NOCA');
  await addBox.press('Enter');
  await addBox.fill('blue j');
  await page.getByRole('button', { name: /Blue Jay/ }).click();
  await addBox.fill('Monk Parakeet');
  await page.getByRole('button', { name: /Add “Monk Parakeet” as written/ }).click();

  await page.getByRole('button', { name: 'One more Northern Cardinal' }).click();
  await page.getByRole('button', { name: 'One more Northern Cardinal' }).click();
  await expect(page.getByText('3 species, 5 birds counted')).toBeVisible();

  await page.getByLabel('Where in the park').selectOption('The Ramble');
  await page.getByLabel('Minutes birding').fill('45');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this checklist for eBird' }).click();
  const csv = readFileSync((await (await downloadPromise).path())!, 'utf8');
  const cardinal = csv.split('\r\n').find((line) => line.startsWith('Northern Cardinal,'));
  expect(cardinal?.split(',').slice(3, 7)).toEqual(['3', '', 'Central Park--The Ramble', '40.78120']);
  expect(cardinal?.split(',')[14]).toBe('45');

  // Survives a reload: it's in IndexedDB, not component state.
  await page.reload();
  await expect(page.getByText('3 species, 5 birds counted')).toBeVisible();

  await page.getByRole('link', { name: 'Your log' }).click();
  await expect(page).toHaveURL(/\/log$/);
  await expect(page.getByRole('link', { name: /The Ramble.*3 species/ })).toBeVisible();
  await page.getByRole('link', { name: /See your lists/ }).click();
  await expect(page.getByText('3 species')).toBeVisible();
  await page.getByRole('link', { name: /Northern Cardinal/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Northern Cardinal' })).toBeVisible();
});

test('deleting an outing removes it from the log', async ({ page }) => {
  await page.goto('/log');
  await page.getByRole('button', { name: 'Start an outing' }).click();
  await page.getByLabel('Add a bird').fill('AMRO');
  await page.getByLabel('Add a bird').press('Enter');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Delete outing' }).click();
  await expect(page).toHaveURL(/\/log$/);
  await expect(page.getByText('No outings yet.')).toBeVisible();
});

test('an unknown outing id shows a helpful message', async ({ page }) => {
  await page.goto('/log/outing?id=00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('heading', { name: 'Outing not found' })).toBeVisible();
});
