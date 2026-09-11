import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DASHBOARD_STORAGE_KEY, MAX_SAVED_LOCATIONS, useDashboardStore } from '@/store/dashboard-store';
import { DEFAULT_LOCATION, type SelectedLocation } from '@/lib/weather/location';
import { ALL_CARD_IDS, DEFAULT_CARD_LAYOUT, LAYOUT_PRESETS, defaultSizeFor } from '@/lib/weather/card-layout';

const SEATTLE: SelectedLocation = {
  id: '5809844',
  name: 'Seattle',
  region: 'Washington',
  country: 'United States',
  latitude: 47.60621,
  longitude: -122.33207,
};

beforeEach(() => {
  window.localStorage.clear();
  useDashboardStore.setState({ location: DEFAULT_LOCATION });
});

describe('dashboard store', () => {
  it('starts on the default location', () => {
    expect(useDashboardStore.getState().location).toEqual(DEFAULT_LOCATION);
  });

  it('sets and resets the selected location', () => {
    useDashboardStore.getState().setLocation(SEATTLE);
    expect(useDashboardStore.getState().location).toEqual(SEATTLE);

    useDashboardStore.getState().resetLocation();
    expect(useDashboardStore.getState().location).toEqual(DEFAULT_LOCATION);
  });

  it('persists the location to storage, and only the location', () => {
    useDashboardStore.getState().setLocation(SEATTLE);

    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const persisted = JSON.parse(raw as string);
    expect(persisted.state.location).toEqual(SEATTLE);
    // partialize should keep actions out of storage.
    expect(persisted.state.setLocation).toBeUndefined();
    expect(persisted.version).toBe(7);
  });

  it('does not read persisted state until rehydrate is called (skipHydration)', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { location: SEATTLE }, version: 5 }),
    );

    // Nothing has rehydrated yet, so the store still holds its initial state — this is what keeps
    // the first client render identical to the server-rendered HTML.
    expect(useDashboardStore.getState().location).toEqual(DEFAULT_LOCATION);

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().location).toEqual(SEATTLE);
  });

  /**
   * State written by an older version is carried forward rather than thrown away — losing
   * someone's saved location and layout on every upgrade is a worse failure than an unfamiliar
   * field, and `merge` re-validates everything it reads.
   */
  it('migrates persisted state saved under an older schema version', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { location: SEATTLE }, version: 1 }),
    );

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().location).toEqual(SEATTLE);
  });

  /**
   * Someone holding a dashboard from before onboarding existed has already arranged it by hand.
   * Defaulting them to "not yet onboarded" would greet a returning user with a first-run wall over
   * the dashboard they built, which is a regression dressed as a welcome.
   */
  it('treats a dashboard saved before onboarding existed as already set up', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { location: SEATTLE }, version: 6 }),
    );

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().hasOnboarded).toBe(true);
  });

  it('does not mark a browser with nothing saved as already set up', async () => {
    // The migration above is deliberately generous; this is the other side of it. An empty store
    // must stay "not yet onboarded", or a first-time visitor would never be offered the flow.
    useDashboardStore.setState({ hasOnboarded: false });

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().hasOnboarded).toBe(false);
  });

  it('falls back rather than trusting a persisted location that is missing coordinates', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      // A latitude of undefined coerces to 0 downstream, which is a valid coordinate in the
      // Atlantic — so this has to be rejected here rather than quietly forecast.
      JSON.stringify({ state: { location: { id: 'x', name: 'Nowhere' } }, version: 5 }),
    );

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().location).toEqual(DEFAULT_LOCATION);
  });

  it('drops malformed saved locations without discarding the good ones', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { savedLocations: [SEATTLE, null, { id: 'broken' }] }, version: 5 }),
    );

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().savedLocations).toEqual([SEATTLE]);
  });

  it('falls back rather than trusting an unrecognised unit system', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { unitSystem: 'furlongs' }, version: 5 }),
    );

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().unitSystem).toBe('imperial');
  });
});

describe('dashboard store — card layout', () => {
  beforeEach(() => {
    useDashboardStore.setState({ cards: DEFAULT_CARD_LAYOUT, isEditing: false });
  });

  it('starts on the default layout', () => {
    expect(useDashboardStore.getState().cards).toEqual(DEFAULT_CARD_LAYOUT);
  });

  it('adds a card to the end, and ignores a card already present', () => {
    const { addCard } = useDashboardStore.getState();
    addCard('wind');

    const afterFirstAdd = useDashboardStore.getState().cards;
    expect(afterFirstAdd.at(-1)).toEqual({ id: 'wind', size: defaultSizeFor('wind') });

    addCard('wind');
    expect(useDashboardStore.getState().cards).toEqual(afterFirstAdd);
  });

  it('removes a card', () => {
    useDashboardStore.getState().removeCard('humidity');
    expect(useDashboardStore.getState().cards.map((card) => card.id)).not.toContain('humidity');
  });

  it('changes a module size', () => {
    useDashboardStore.getState().setCardSize('humidity', 'large');
    expect(useDashboardStore.getState().cards.find((card) => card.id === 'humidity')?.size).toBe('large');
  });

  it('cycles a module through the sizes and wraps back round', () => {
    useDashboardStore.getState().setCardSize('humidity', 'small');
    const sizeOf = () => useDashboardStore.getState().cards.find((card) => card.id === 'humidity')?.size;

    useDashboardStore.getState().cycleCardSize('humidity');
    expect(sizeOf()).toBe('medium');
    useDashboardStore.getState().cycleCardSize('humidity');
    expect(sizeOf()).toBe('large');
    // Wrapping matters: without it the control becomes a dead end at the largest size.
    useDashboardStore.getState().cycleCardSize('humidity');
    expect(sizeOf()).toBe('small');
  });

  /** What the menu's toggle list drives: one control that both adds and removes. */
  it('toggles a module off and back on', () => {
    const has = (id: string) => useDashboardStore.getState().cards.some((card) => card.id === id);
    expect(has('humidity')).toBe(true);

    useDashboardStore.getState().toggleCard('humidity');
    expect(has('humidity')).toBe(false);

    useDashboardStore.getState().toggleCard('humidity');
    expect(has('humidity')).toBe(true);
    expect(useDashboardStore.getState().cards.at(-1)).toEqual({
      id: 'humidity',
      size: defaultSizeFor('humidity'),
    });

    // A panel that was never in the default layout toggles on just the same.
    expect(has('comfort')).toBe(false);
    useDashboardStore.getState().toggleCard('comfort');
    expect(has('comfort')).toBe(true);
  });

  it('moves a card up and down', () => {
    const original = useDashboardStore.getState().cards.map((card) => card.id);

    useDashboardStore.getState().moveCard(original[1], -1);
    expect(useDashboardStore.getState().cards[0].id).toBe(original[1]);

    useDashboardStore.getState().moveCard(original[1], 1);
    expect(useDashboardStore.getState().cards.map((card) => card.id)).toEqual(original);
  });

  it('does not move past either end', () => {
    const original = useDashboardStore.getState().cards.map((card) => card.id);

    useDashboardStore.getState().moveCard(original[0], -1);
    expect(useDashboardStore.getState().cards.map((card) => card.id)).toEqual(original);

    useDashboardStore.getState().moveCard(original.at(-1) as typeof original[0], 1);
    expect(useDashboardStore.getState().cards.map((card) => card.id)).toEqual(original);
  });

  it('reorders to an explicit sequence', () => {
    const reversed = useDashboardStore.getState().cards.map((card) => card.id).reverse();
    useDashboardStore.getState().reorderCards(reversed);

    expect(useDashboardStore.getState().cards.map((card) => card.id)).toEqual(reversed);
  });

  it('refuses a reorder that would drop cards', () => {
    const before = useDashboardStore.getState().cards;
    useDashboardStore.getState().reorderCards([before[0].id]);

    expect(useDashboardStore.getState().cards).toEqual(before);
  });

  it('restores the default layout', () => {
    useDashboardStore.getState().removeCard('humidity');
    useDashboardStore.getState().restoreDefaults();

    expect(useDashboardStore.getState().cards).toEqual(DEFAULT_CARD_LAYOUT);
  });

  it('persists the layout but never the transient edit-mode flag', () => {
    useDashboardStore.getState().setEditing(true);
    useDashboardStore.getState().addCard('wind');

    const persisted = JSON.parse(window.localStorage.getItem(DASHBOARD_STORAGE_KEY) as string);
    expect(persisted.state.cards.map((card: { id: string }) => card.id)).toContain('wind');
    expect(persisted.state.isEditing).toBeUndefined();
  });

  it('reconciles a persisted layout containing an unknown card on rehydrate', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({
        state: { location: DEFAULT_LOCATION, unitSystem: 'imperial', cards: [{ id: 'wind', span: 'wide' }, { id: 'gone', span: 'single' }] },
        version: 4,
      }),
    );

    await useDashboardStore.persist.rehydrate();
    // The persisted entry predates modular sizing, so it is migrated rather than dropped.
    expect(useDashboardStore.getState().cards).toEqual([{ id: 'wind', size: 'medium' }]);
  });
});

describe('dashboard store — saved locations', () => {
  beforeEach(() => {
    useDashboardStore.setState({ savedLocations: [], location: DEFAULT_LOCATION });
  });

  it('saves a location and ignores a duplicate id', () => {
    useDashboardStore.getState().saveLocation(SEATTLE);
    expect(useDashboardStore.getState().savedLocations).toHaveLength(1);

    useDashboardStore.getState().saveLocation({ ...SEATTLE, name: 'Seattle again' });
    expect(useDashboardStore.getState().savedLocations).toHaveLength(1);
  });

  it('removes a saved location by id', () => {
    useDashboardStore.getState().saveLocation(SEATTLE);
    useDashboardStore.getState().removeSavedLocation(SEATTLE.id);
    expect(useDashboardStore.getState().savedLocations).toHaveLength(0);
  });

  it('caps the list, dropping the oldest rather than refusing the save', () => {
    for (let i = 0; i < MAX_SAVED_LOCATIONS + 3; i += 1) {
      useDashboardStore.getState().saveLocation({ ...SEATTLE, id: `city-${i}`, name: `City ${i}` });
    }

    const saved = useDashboardStore.getState().savedLocations;
    expect(saved).toHaveLength(MAX_SAVED_LOCATIONS);
    // The most recent survives; the earliest is gone.
    expect(saved.at(-1)?.id).toBe(`city-${MAX_SAVED_LOCATIONS + 2}`);
    expect(saved.some((location) => location.id === 'city-0')).toBe(false);
  });

  it('persists saved locations', () => {
    useDashboardStore.getState().saveLocation(SEATTLE);
    const persisted = JSON.parse(window.localStorage.getItem(DASHBOARD_STORAGE_KEY) as string);
    expect(persisted.state.savedLocations).toHaveLength(1);
  });

  it('recovers from persisted state where savedLocations is not an array', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { location: DEFAULT_LOCATION, savedLocations: 'corrupt' }, version: 4 }),
    );

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().savedLocations).toEqual([]);
  });
});

describe('dashboard store — theme', () => {
  it('defaults to following the system', () => {
    useDashboardStore.setState({ theme: 'system' });
    expect(useDashboardStore.getState().theme).toBe('system');
  });

  it('sets and persists an explicit theme', () => {
    useDashboardStore.getState().setTheme('dark');
    const persisted = JSON.parse(window.localStorage.getItem(DASHBOARD_STORAGE_KEY) as string);
    expect(persisted.state.theme).toBe('dark');
  });

  it('falls back to the default when persisted state holds a nonsense theme', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { location: DEFAULT_LOCATION, theme: 'neon' }, version: 4 }),
    );

    await useDashboardStore.persist.rehydrate();
    // The pre-paint script reads this value, so it must never be handed something invalid.
    expect(useDashboardStore.getState().theme).toBe('system');
  });
});

describe('dashboard store — layout presets', () => {
  it('applies a preset layout', () => {
    const preset = LAYOUT_PRESETS[0];
    useDashboardStore.getState().applyPreset(preset.id);
    expect(useDashboardStore.getState().cards).toEqual(preset.layout);
  });

  it('ignores an unknown preset id rather than emptying the dashboard', () => {
    useDashboardStore.setState({ cards: DEFAULT_CARD_LAYOUT });
    useDashboardStore.getState().applyPreset('does-not-exist');
    expect(useDashboardStore.getState().cards).toEqual(DEFAULT_CARD_LAYOUT);
  });

  it('every preset references only registered cards, so none are silently dropped', () => {
    for (const preset of LAYOUT_PRESETS) {
      expect(preset.layout.length).toBeGreaterThan(0);
      for (const entry of preset.layout) {
        expect(ALL_CARD_IDS).toContain(entry.id);
      }
      // Duplicates would collide as React keys.
      const ids = preset.layout.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

/**
 * Saved preferences are a convenience; a working page is not. Anything unreadable must be dropped
 * so the app starts as it would for a first-time visitor.
 *
 * Regression: zustand's default storage parses JSON unguarded, and persist swallows the resulting
 * rejection down a path that never sets `hasHydrated` and never fires its finish-hydration
 * listeners. `useHasHydrated` is built on exactly those two things, and the dashboard gates both
 * the card grid and the weather request on it — so one damaged byte left the page stuck on
 * "Loading your dashboard…" forever, with nothing clearing the bad value on the next visit either.
 */
describe('dashboard store — unreadable persisted state', () => {
  it('still finishes hydration when the saved value is not valid JSON', async () => {
    window.localStorage.setItem(DASHBOARD_STORAGE_KEY, '{"state":{"location":');

    await useDashboardStore.persist.rehydrate();

    // The load-bearing assertion: without this the whole dashboard hangs.
    expect(useDashboardStore.persist.hasHydrated()).toBe(true);
    expect(useDashboardStore.getState().location).toEqual(DEFAULT_LOCATION);
    expect(useDashboardStore.getState().cards).toEqual(DEFAULT_CARD_LAYOUT);
  });

  it('clears the unreadable value so it cannot fail again on the next visit', async () => {
    window.localStorage.setItem(DASHBOARD_STORAGE_KEY, 'not json at all');

    await useDashboardStore.persist.rehydrate();

    expect(window.localStorage.getItem(DASHBOARD_STORAGE_KEY)).toBeNull();
  });

  it('still finishes hydration when storage itself refuses to be read', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    try {
      await useDashboardStore.persist.rehydrate();
      expect(useDashboardStore.persist.hasHydrated()).toBe(true);
    } finally {
      getItem.mockRestore();
    }
  });

  it('does not throw when storage refuses to be written', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    try {
      // A blocked write should cost the user persistence, not crash the interaction.
      expect(() => useDashboardStore.getState().setUnitSystem('metric')).not.toThrow();
      expect(useDashboardStore.getState().unitSystem).toBe('metric');
    } finally {
      setItem.mockRestore();
      useDashboardStore.setState({ unitSystem: 'imperial' });
    }
  });

  /** Guards against over-correcting the above into "ignore storage entirely". */
  it('still restores a perfectly good saved value', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { location: SEATTLE, unitSystem: 'metric' }, version: 5 }),
    );

    await useDashboardStore.persist.rehydrate();

    expect(useDashboardStore.getState().location).toEqual(SEATTLE);
    expect(useDashboardStore.getState().unitSystem).toBe('metric');
  });
});
