import { describe, expect, it, vi } from 'vitest';
import { ACTIVITIES, findActivityWindows } from '@/lib/weather/activity-windows';
import { composeLayoutForActivities, DEFAULT_CARD_LAYOUT } from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION, type SelectedLocation } from '@/lib/weather/location';
import { mockWeatherData } from '@/lib/weather/mock-data';
import { buildShareUrl, decodePreferences, encodePreferences, SHARE_PARAM } from '@/lib/weather/share-link';
import { MAX_SAVED_LOCATIONS, validatePreferences, type PersistedPreferences } from '@/store/dashboard-store';

const PORTLAND: SelectedLocation = {
  id: '5746545',
  name: 'Portland',
  region: 'Oregon',
  country: 'United States',
  latitude: 45.5152,
  longitude: -122.6784,
};

const PREFERENCES: PersistedPreferences = {
  location: PORTLAND,
  savedLocations: [PORTLAND],
  unitSystem: 'metric',
  theme: 'dark',
  cards: [
    { id: 'temperature', size: 'medium' },
    { id: 'wind-speed', size: 'small' },
  ],
  activities: ['cycle', 'walk'],
  hasOnboarded: true,
};

/**
 * `validatePreferences` is the single gate in front of every preference the app restores, from
 * localStorage *or* from a link a stranger sent. These tests are mostly about the second case: a
 * link is the one input here that an attacker fully controls.
 */
describe('validatePreferences', () => {
  it('turns junk into usable defaults rather than throwing', () => {
    // A page that will not start is a far worse outcome than a lost preference — the lesson of the
    // unreadable-localStorage bug that bricked the dashboard permanently.
    for (const junk of [null, undefined, 'nonsense', 42, [], true]) {
      const result = validatePreferences(junk);
      expect(result.location).toEqual(DEFAULT_LOCATION);
      expect(result.cards).toEqual(DEFAULT_CARD_LAYOUT);
      expect(result.activities).toEqual([]);
      expect(result.hasOnboarded).toBe(false);
    }
  });

  it('drops activities it does not recognise instead of passing them to the finder', () => {
    const result = validatePreferences({ activities: ['walk', 'skydive', 7, null, 'cycle'] });
    expect(result.activities).toEqual(['walk', 'cycle']);
  });

  it('de-duplicates activities, so one choice cannot be repeated into many rows', () => {
    expect(validatePreferences({ activities: ['run', 'run', 'run'] }).activities).toEqual(['run']);
  });

  it('rejects a location missing a coordinate rather than forwarding it to the weather route', () => {
    // A missing latitude coerces to 0 downstream and silently resolves to a point in the Atlantic.
    const result = validatePreferences({ location: { id: 'x', name: 'Nowhere', longitude: 4 } });
    expect(result.location).toEqual(DEFAULT_LOCATION);
  });

  it('caps saved locations, so a hand-written link cannot flood the chip row', () => {
    const many = Array.from({ length: 40 }, (_, index) => ({ ...PORTLAND, id: `loc-${index}` }));
    expect(validatePreferences({ savedLocations: many }).savedLocations).toHaveLength(MAX_SAVED_LOCATIONS);
  });

  it('only accepts a real boolean for hasOnboarded', () => {
    expect(validatePreferences({ hasOnboarded: 'yes' }).hasOnboarded).toBe(false);
    expect(validatePreferences({ hasOnboarded: 1 }).hasOnboarded).toBe(false);
    expect(validatePreferences({ hasOnboarded: true }).hasOnboarded).toBe(true);
  });

  it('falls back to a locale guess on an unknown unit system, and to system on an unknown theme', () => {
    // jsdom's default navigator.language is en-US, so the unstubbed fallback lands on imperial —
    // the same value it always fell back to before locale guessing existed.
    const result = validatePreferences({ unitSystem: 'furlongs', theme: 'neon' });
    expect(result.unitSystem).toBe('imperial');
    expect(result.theme).toBe('system');
  });

  it('guesses units from the browser locale when none was ever saved, but a saved choice always wins', () => {
    vi.stubGlobal('navigator', { ...globalThis.navigator, language: 'en-GB', languages: ['en-GB'] });
    try {
      expect(validatePreferences({}).unitSystem).toBe('metric');
      // An explicit choice — including one made before this locale guessing existed — is never
      // second-guessed by the visitor's locale.
      expect(validatePreferences({ unitSystem: 'imperial' }).unitSystem).toBe('imperial');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('the shareable setup link', () => {
  it('round-trips a full set of preferences', () => {
    const decoded = decodePreferences(encodePreferences(PREFERENCES));
    expect(decoded).toEqual(PREFERENCES);
  });

  it('survives non-ASCII place names', () => {
    // btoa is latin1-only, so anything that skips the UTF-8 encode step breaks exactly here.
    const zurich = { ...PORTLAND, id: 'z', name: 'Zürich', region: 'Zürich', country: 'Schweiz' };
    const decoded = decodePreferences(encodePreferences({ ...PREFERENCES, location: zurich }));
    expect(decoded?.location.name).toBe('Zürich');
  });

  it('returns null for anything it cannot read, rather than a half-built dashboard', () => {
    for (const bad of [null, undefined, '', 'not-base64!!', btoa('{"nope":true}'), btoa('not json')]) {
      expect(decodePreferences(bad)).toBeNull();
    }
  });

  it('refuses a payload from a different wire version', () => {
    const wrongVersion = encodePreferences(PREFERENCES).replace(/^./, '');
    expect(decodePreferences(wrongVersion)).toBeNull();
  });

  it('refuses an oversized parameter without parsing it', () => {
    expect(decodePreferences('A'.repeat(5000))).toBeNull();
  });

  it('validates a hostile payload instead of trusting it', () => {
    // What a crafted link would try: unknown modules, a bogus theme read by the pre-paint script,
    // and a location with no latitude.
    const hostile = {
      v: 1,
      l: { id: 'evil', name: 'Evil', longitude: 999 },
      t: 'javascript:alert(1)',
      u: 'furlongs',
      c: [['../../etc/passwd', 'huge'], ['temperature', 'small']],
      a: ['walk', '__proto__'],
    };
    const encoded = btoa(JSON.stringify(hostile)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

    const decoded = decodePreferences(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.location).toEqual(DEFAULT_LOCATION);
    expect(decoded?.theme).toBe('system');
    expect(decoded?.unitSystem).toBe('imperial');
    expect(decoded?.activities).toEqual(['walk']);
    // The unknown id is dropped; the real one survives with a valid size.
    expect(decoded?.cards).toEqual([{ id: 'temperature', size: 'small' }]);
  });

  it('builds a URL carrying the setup, leaving the rest of the address alone', () => {
    const url = buildShareUrl('https://example.com/dashboard?keep=1', PREFERENCES);
    const parsed = new URL(url);

    expect(parsed.pathname).toBe('/dashboard');
    expect(parsed.searchParams.get('keep')).toBe('1');
    expect(decodePreferences(parsed.searchParams.get(SHARE_PARAM))).toEqual(PREFERENCES);
  });
});

describe('composeLayoutForActivities', () => {
  it('leaves out the activity panel when there is no activity to answer for', () => {
    const layout = composeLayoutForActivities([]);
    expect(layout.map((entry) => entry.id)).not.toContain('activity-windows');
    expect(layout.length).toBeGreaterThan(0);
  });

  it('includes the activity panel as soon as one activity is chosen', () => {
    expect(composeLayoutForActivities(['walk']).map((entry) => entry.id)).toContain('activity-windows');
  });

  it('gives a cyclist the readings a bike actually depends on', () => {
    const ids = composeLayoutForActivities(['cycle']).map((entry) => entry.id);
    expect(ids).toEqual(expect.arrayContaining(['wind-speed', 'wind', 'precipitation-chance']));
  });

  it('produces the same dashboard whatever order the activities were picked in', () => {
    // Otherwise two people giving identical answers get different dashboards, and "redo setup"
    // would quietly reshuffle the grid.
    expect(composeLayoutForActivities(['garden', 'cycle', 'walk'])).toEqual(
      composeLayoutForActivities(['walk', 'cycle', 'garden']),
    );
  });

  it('lists a module once even when several activities ask for it', () => {
    const ids = composeLayoutForActivities(['walk', 'cycle']).map((entry) => entry.id);
    expect(ids.filter((id) => id === 'precipitation-chance')).toHaveLength(1);
  });
});

describe('activity selection and the activity panel', () => {
  it('reports every activity when nothing has been chosen', () => {
    // Empty means "unspecified", not "none" — every dashboard saved before this feature existed
    // has an empty list and must keep showing all four.
    expect(findActivityWindows(mockWeatherData, []).map((entry) => entry.definition.id)).toEqual(
      ACTIVITIES.map((activity) => activity.id),
    );
    expect(findActivityWindows(mockWeatherData)).toHaveLength(ACTIVITIES.length);
  });

  it('reports only the chosen activities once a choice has been made', () => {
    const reported = findActivityWindows(mockWeatherData, ['cycle', 'garden']);
    expect(reported.map((entry) => entry.definition.id)).toEqual(['cycle', 'garden']);
  });
});
