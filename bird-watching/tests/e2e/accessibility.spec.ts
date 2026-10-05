import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Serious and critical only, matching the weather dashboard's bar. Extend this list with every
// new page or major UI state.
const PAGES = ['/', '/guide', '/guide/amerob', '/guide/rudduc', '/guide/glossary'];

async function expectNoSeriousViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

for (const path of PAGES) {
  test(`no serious axe violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoSeriousViolations(page);
  });
}

test('no serious axe violations with guide filters open and active', async ({ page }) => {
  await page.goto('/guide');
  await page.locator('summary', { hasText: 'Filter by what you saw' }).click();
  await page.getByRole('button', { name: 'Red' }).click();
  await expectNoSeriousViolations(page);
});
