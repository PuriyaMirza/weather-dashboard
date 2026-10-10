import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// An 8×8 PNG: enough for the crop/encode path; the identify route is stubbed.
const PHOTO = {
  name: 'osprey.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNoSHDAihiGlgQAMmxIAVDoDUIAAAAASUVORK5CYII=', 'base64'),
};

const RESULT = {
  candidates: [
    { speciesCode: 'osprey', commonName: 'Osprey', scientificName: 'Pandion haliaetus', confidence: 'high', fieldMarks: 'Dark eye stripe, white underparts' },
  ],
  date: '2026-09-20',
  time: null,
  place: { name: 'Jamaica Bay', parkArea: null, stateCode: 'NY', countryCode: 'US', latitude: 40.61, longitude: -73.83, mapLabel: 'Jamaica Bay, New York, US' },
  count: null,
};

const OSPREY_PHOTO = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Osprey.jpg/800px-Osprey.jpg', width: 800, height: 600,
  artist: 'A. Birder', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Osprey.jpg',
};

// What the "Show me more options" call returns: lookalikes only.
const MORE = {
  ...RESULT,
  candidates: [{ speciesCode: 'baleag', commonName: 'Bald Eagle', scientificName: 'Haliaeetus leucocephalus', confidence: 'low', fieldMarks: 'Large raptor' }],
};

type Sent = { image: string; note: string; now: string; exclude?: string[] };

async function reachConfirm(page: Page) {
  const sent: Sent[] = [];
  await page.route('**/api/identify', async (route) => {
    const body = route.request().postDataJSON() as Sent;
    sent.push(body);
    await route.fulfill({ json: body.exclude ? MORE : RESULT });
  });
  // Reference photos load separately; only the Osprey has one here.
  await page.route('**/api/species-photo?*', (route) =>
    route.fulfill({ json: { photo: new URL(route.request().url()).searchParams.get('sci') === 'Pandion haliaetus' ? OSPREY_PHOTO : null } }),
  );
  await page.goto('/log');
  await page.getByRole('link', { name: 'Add a bird from a photo' }).click();
  await page.getByLabel('Choose a photo').setInputFiles(PHOTO);
  await page.getByRole('button', { name: 'Tap where the bird is' }).click();
  await page.getByLabel('When and where did you see it?').fill('Sept 20 at Jamaica Bay');
  await page.getByRole('button', { name: 'Identify bird' }).click();
  await expect(page.getByRole('radio', { name: /Osprey/ })).toBeChecked();
  return sent;
}

test('identify a bird from a photo, confirm, and find it in the log', async ({ page }) => {
  const sent = await reachConfirm(page);
  expect(sent).toHaveLength(1);
  expect(sent[0].note).toBe('Sept 20 at Jamaica Bay');
  expect(sent[0].image).toMatch(/^[A-Za-z0-9+/=]+$/);

  // Each suggestion carries a reference photo with its credit; one without a photo shows none.
  const osprey = page.locator('label', { has: page.getByRole('radio', { name: /Osprey/ }) });
  await expect(osprey.locator('img')).toHaveCount(1);
  await expect(osprey.getByText('Photo: A. Birder')).toBeVisible();
  await expect(osprey.getByRole('link', { name: /Wikimedia Commons/ })).toHaveAttribute('href', 'https://commons.wikimedia.org/wiki/File:Osprey.jpg');
  // Lookalikes cost a second call, so it's made only when asked for — with the same crop, excluding what's shown.
  await expect(page.getByRole('radio', { name: /Bald Eagle/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show me more options' }).click();
  await expect(page.getByRole('radio', { name: /Bald Eagle/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show me more options' })).toHaveCount(0);
  expect(sent).toHaveLength(2);
  expect(sent[1].exclude).toEqual(['Pandion haliaetus']);
  expect(sent[1].image).toBe(sent[0].image);
  await expect(page.getByRole('radio', { name: /Osprey/ })).toBeChecked();
  const eagle = page.locator('label', { has: page.getByRole('radio', { name: /Bald Eagle/ }) });
  await expect(eagle.locator('img')).toHaveCount(0);

  await expect(page.getByLabel('When')).toHaveValue('2026-09-20T12:00');
  await expect(page.getByLabel('Where')).toHaveValue('Jamaica Bay');
  await expect(page.getByLabel(/Use map point/)).toBeChecked();
  await page.getByRole('button', { name: 'Add to my log' }).click();

  await expect(page).toHaveURL(/\/log\/outing\?id=/);
  await expect(page.getByRole('heading', { name: 'Jamaica Bay' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Your photo of Osprey' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this checklist for eBird' }).click();
  const row = readFileSync((await (await downloadPromise).path())!, 'utf8').split('\r\n')[0].split(',');
  expect(row.slice(0, 13)).toEqual(['Osprey', 'Pandion', 'haliaetus', '1', '', 'Jamaica Bay', '40.61000', '-73.83000', '09/20/2026', '12:00', 'NY', 'US', 'incidental']);
});

test('no serious axe violations on the photo confirm screen', async ({ page }) => {
  await reachConfirm(page);
  await page.getByRole('button', { name: 'Show me more options' }).click();
  await expect(page.getByRole('radio', { name: /Bald Eagle/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
