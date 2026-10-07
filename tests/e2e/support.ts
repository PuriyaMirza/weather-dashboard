import type { Page } from '@playwright/test';
import { mockWeatherData, mockWeekWeatherData } from '../../lib/weather/mock-data';
import type { WeatherDashboardData } from '../../lib/weather/types';

export const STORAGE_KEY = 'weather-dashboard';

/** Matches the persist `version` in store/dashboard-store.ts. */
export const STORAGE_VERSION = 12;

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

/**
 * Replaces stored preferences with `state` (plus `hasOnboarded`), for a spec whose `beforeEach`
 * already ran `markOnboarded` — that one seeds only an empty store, so a second call would be a
 * no-op. First navigation only, like `markFirstVisit`, so a reload keeps what the test changed.
 */
export function seedPreferences(page: Page, state: Record<string, unknown>) {
  return page.addInitScript(
    ([key, value]) => {
      if (window.sessionStorage.getItem('e2e-seeded') === null) {
        window.sessionStorage.setItem('e2e-seeded', '1');
        window.localStorage.setItem(key as string, value as string);
      }
    },
    [STORAGE_KEY, JSON.stringify({ state: { hasOnboarded: true, ...state }, version: STORAGE_VERSION })] as const,
  );
}

/**
 * The modules the day picker drives, beside a reading about now that must never follow it. The
 * default layout carries only the briefing, so specs about the other day-following modules seed
 * this instead.
 */
export const DAY_FOLLOWING_LAYOUT = [
  { id: 'hourly-temperature', size: 'large' },
  { id: 'precipitation', size: 'medium' },
  { id: 'activity-windows', size: 'medium' },
  { id: 'humidity', size: 'small' },
  { id: 'uv-index', size: 'small' },
];

/** The Compare specs' second place, as a saved location. Portland is the app's own default. */
export const LISBON = {
  id: '2267057',
  name: 'Lisbon',
  region: 'Lisbon',
  country: 'Portugal',
  latitude: 38.7167,
  longitude: -9.1333,
};

export const PORTLAND = {
  id: '5746545',
  name: 'Portland',
  region: 'Oregon',
  country: 'United States',
  latitude: 45.5152,
  longitude: -122.6784,
};

/**
 * Lisbon's forecast: warmer than the Portland fixture, and a calendar day ahead of it (Sun 19 –
 * Tue 21 July against Sat 18 – Mon 20), so "By day" has a row each place is missing.
 */
export const lisbonWeatherData: WeatherDashboardData = {
  ...mockWeekWeatherData,
  location: { ...mockWeatherData.location, name: 'Lisbon', region: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon', latitude: LISBON.latitude, longitude: LISBON.longitude },
  current: { ...mockWeatherData.current!, temperatureF: 80, condition: 'sunny', conditionLabel: 'Clear sky' },
  daily: [
    { ...mockWeatherData.daily[0], date: '2026-07-19', condition: 'sunny', conditionLabel: 'Clear sky', highF: 86, lowF: 66 },
    { ...mockWeatherData.daily[1], date: '2026-07-20', highF: 88, lowF: 67 },
    { ...mockWeatherData.daily[2], date: '2026-07-21', highF: 84, lowF: 65 },
  ],
};

/**
 * Answers `/api/weather` by the requested latitude, so two places on screen at once each get their
 * own forecast. Anything not listed gets the Portland fixture.
 */
export function stubWeatherByLatitude(page: Page, byLatitude: Record<string, WeatherDashboardData> = { [LISBON.latitude]: lisbonWeatherData }) {
  return page.route('**/api/weather*', (route) => {
    const latitude = new URL(route.request().url()).searchParams.get('latitude') ?? '';
    const match = Object.entries(byLatitude).find(([key]) => Number(key) === Number(latitude));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(match ? match[1] : mockWeekWeatherData),
    });
  });
}
