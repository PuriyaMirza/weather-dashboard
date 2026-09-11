import type { Page } from '@playwright/test';

export const STORAGE_KEY = 'weather-dashboard';

/** Matches the persist `version` in store/dashboard-store.ts. */
export const STORAGE_VERSION = 7;

/**
 * Marks the browser as having already been through the first-run flow.
 *
 * Nearly every spec in this suite is about the dashboard a returning visitor uses, not about being
 * greeted. Without this the onboarding dialog covers the page and every control behind it becomes
 * unclickable, which reads as a dozen unrelated failures rather than one missing setup step.
 *
 * A spec that seeds its own preferences must include `hasOnboarded: true` itself — its init script
 * runs after this one and replaces the whole value.
 */
/**
 * Undoes `markOnboarded` for the specs that are about being greeted. Added after it, so this init
 * script runs last and wins.
 */
export function markFirstVisit(page: Page) {
  return page.addInitScript((key) => {
    // Only on the *first* navigation. An init script runs again on every reload, so clearing
    // unconditionally would wipe the preferences a test had just saved — turning "the answers
    // stick" into a failure caused entirely by its own setup.
    if (window.sessionStorage.getItem('e2e-visited') === null) {
      window.sessionStorage.setItem('e2e-visited', '1');
      window.localStorage.removeItem(key as string);
    }
  }, STORAGE_KEY);
}

/**
 * Builds a `?p=` value by hand rather than importing the encoder.
 *
 * The link format is a wire contract — old links must keep working — so the test states the shape
 * independently. An encoder that changed shape would then fail here instead of agreeing with itself.
 */
export function encodeSetup(wire: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(wire), 'utf8').toString('base64url');
}

/**
 * Opens the location dialog from the hero's location button.
 *
 * Changing location moved off the permanently-visible top row and behind this button, so any spec
 * that wants the search box or the saved-location chips has to open it first, same as a real
 * visitor would.
 */
export function openLocationPanel(page: Page) {
  return page.getByRole('button', { name: /change location/i }).click();
}

export function markOnboarded(page: Page, state: Record<string, unknown> = {}) {
  return page.addInitScript(
    ([key, value]) => {
      // Seeds only when nothing is stored. This script runs again on every reload, and overwriting
      // there would discard whatever the test had just saved — which is precisely what the
      // "survives a reload" specs are checking.
      if (window.localStorage.getItem(key as string) === null) {
        window.localStorage.setItem(key as string, value as string);
      }
    },
    [STORAGE_KEY, JSON.stringify({ state: { hasOnboarded: true, ...state }, version: STORAGE_VERSION })] as const,
  );
}
