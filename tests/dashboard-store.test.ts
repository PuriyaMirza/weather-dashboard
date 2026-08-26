import { beforeEach, describe, expect, it } from 'vitest';
import { DASHBOARD_STORAGE_KEY, MAX_SAVED_LOCATIONS, useDashboardStore } from '@/store/dashboard-store';
import { DEFAULT_LOCATION, type SelectedLocation } from '@/lib/weather/location';
import { ALL_CARD_IDS, DEFAULT_CARD_LAYOUT, LAYOUT_PRESETS } from '@/lib/weather/card-layout';

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
    expect(persisted.version).toBe(4);
  });

  it('does not read persisted state until rehydrate is called (skipHydration)', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { location: SEATTLE }, version: 4 }),
    );

    // Nothing has rehydrated yet, so the store still holds its initial state — this is what keeps
    // the first client render identical to the server-rendered HTML.
    expect(useDashboardStore.getState().location).toEqual(DEFAULT_LOCATION);

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().location).toEqual(SEATTLE);
  });

  it('discards persisted state saved under an older schema version', async () => {
    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ state: { location: SEATTLE }, version: 3 }),
    );

    await useDashboardStore.persist.rehydrate();
    expect(useDashboardStore.getState().location).toEqual(DEFAULT_LOCATION);
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
    expect(afterFirstAdd.at(-1)).toEqual({ id: 'wind', span: 'single' });

    addCard('wind');
    expect(useDashboardStore.getState().cards).toEqual(afterFirstAdd);
  });

  it('removes a card', () => {
    useDashboardStore.getState().removeCard('comfort');
    expect(useDashboardStore.getState().cards.map((card) => card.id)).not.toContain('comfort');
  });

  it('changes a card span', () => {
    useDashboardStore.getState().setCardSpan('comfort', 'wide');
    expect(useDashboardStore.getState().cards.find((card) => card.id === 'comfort')?.span).toBe('wide');
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
    useDashboardStore.getState().removeCard('comfort');
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
    expect(useDashboardStore.getState().cards).toEqual([{ id: 'wind', span: 'wide' }]);
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
