import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import type { WeatherCardId } from '@/components/weather/card-registry';
import {
  DEFAULT_CARD_LAYOUT,
  LAYOUT_PRESETS,
  CARD_SIZES,
  defaultSizeFor,
  reconcileLayout,
  type CardLayoutEntry,
  type CardSize,
} from '@/lib/weather/card-layout';
import { isActivityId, type ActivityId } from '@/lib/weather/activity-windows';
import {
  DEFAULT_COMPARE_LAYOUT,
  isCompareLayout,
  isSamePlace,
  type CompareLayout,
} from '@/lib/weather/compare';
import { DEFAULT_LOCATION, type SelectedLocation } from '@/lib/weather/location';
import { DEFAULT_THEME, toThemeId, type ThemeId } from '@/lib/theme';
import { defaultUnitSystem, type UnitSystem } from '@/lib/weather/units';

/** Keeps the saved list from growing without bound and the chip row from wrapping endlessly. */
export const MAX_SAVED_LOCATIONS = 8;

export { DEFAULT_THEME };

/**
 * The preference fields that outlive the session — everything `partialize` writes, and everything a
 * shared setup link can carry. Kept as its own type because both paths validate against it.
 */
export interface PersistedPreferences {
  location: SelectedLocation;
  savedLocations: SelectedLocation[];
  unitSystem: UnitSystem;
  theme: ThemeId;
  cards: CardLayoutEntry[];
  activities: ActivityId[];
  hasOnboarded: boolean;
  /**
   * The second place the Compare view sets beside `location`; null until one is chosen. Remembered
   * like a saved location, so reopening Compare returns to the same pair.
   */
  compareLocation: SelectedLocation | null;
  compareLayout: CompareLayout;
}

/** What the onboarding flow hands back when someone finishes it. */
export interface OnboardingResult {
  location: SelectedLocation;
  activities: ActivityId[];
  cards: CardLayoutEntry[];
}

export interface DashboardState extends PersistedPreferences {
  /** Transient UI state — deliberately not persisted, so a reload never starts in edit mode. */
  isEditing: boolean;
  /**
   * Whether the Compare view is showing. Transient for the same reason as `isEditing`: a reload
   * lands on the dashboard, not halfway through a question asked last week.
   */
  isComparing: boolean;

  setLocation: (location: SelectedLocation) => void;
  resetLocation: () => void;
  saveLocation: (location: SelectedLocation) => void;
  removeSavedLocation: (id: string) => void;

  setUnitSystem: (unitSystem: UnitSystem) => void;
  setTheme: (theme: ThemeId) => void;

  setEditing: (isEditing: boolean) => void;
  setComparing: (isComparing: boolean) => void;
  /** Refused (a no-op) when the place is the dashboard's own location. */
  setCompareLocation: (location: SelectedLocation | null) => void;
  setCompareLayout: (layout: CompareLayout) => void;
  /** Makes the compared place the dashboard's location and vice versa; a no-op with nothing to compare. */
  swapCompareLocations: () => void;
  addCard: (id: WeatherCardId) => void;
  removeCard: (id: WeatherCardId) => void;
  /** Adds the module if it is absent, removes it if present — what the menu's toggle list needs. */
  toggleCard: (id: WeatherCardId) => void;
  setCardSize: (id: WeatherCardId, size: CardSize) => void;
  /** Advances a module to the next size, wrapping large back round to small. */
  cycleCardSize: (id: WeatherCardId) => void;
  /** Reorders to an explicit id sequence — used by drag-and-drop and tap-to-place. */
  reorderCards: (orderedIds: WeatherCardId[]) => void;
  applyPreset: (presetId: string) => void;
  restoreDefaults: () => void;

  setActivities: (activities: ActivityId[]) => void;
  /** One atomic write, so a half-finished setup is never persisted. */
  completeOnboarding: (result: OnboardingResult) => void;
  skipOnboarding: () => void;
  restartOnboarding: () => void;
  /** Replaces every preference at once — used when arriving with a shared setup link. */
  applyPreferences: (preferences: PersistedPreferences) => void;
}

export const DASHBOARD_STORAGE_KEY = 'weather-dashboard';

/**
 * Persisted locations are re-checked on load. A location missing a coordinate is not merely
 * cosmetic: it would be handed to the weather route, where a missing latitude coerces to 0 and
 * silently resolves to a point in the Atlantic rather than failing.
 */
function isSelectedLocation(value: unknown): value is SelectedLocation {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<SelectedLocation>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.latitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.longitude)
  );
}

/**
 * The compare place that can stand beside `location`: unchanged, or null when it is the very same
 * place. Comparing a place with itself is a sentence that always says "about the same" and two
 * identical columns, so every path that moves the main location (or restores one from storage or
 * a link) drops a compare place it now coincides with, rather than guessing a different one.
 */
function compareLocationBeside(
  location: SelectedLocation,
  compareLocation: SelectedLocation | null,
): SelectedLocation | null {
  return compareLocation && !isSamePlace(location, compareLocation) ? compareLocation : null;
}

/**
 * Coerces anything claiming to be saved preferences into preferences this version can actually run.
 *
 * Two callers depend on this, and the second is why it is a shared function rather than inline code
 * in `merge`: stored state (which `migrate` deliberately passes through unvalidated, so this is the
 * only gate) and the payload of a shared setup link. A link is *attacker-supplied* — anyone can
 * send someone a URL — so it gets exactly the validation stored state gets. Two parallel
 * implementations would drift, and the weaker one would be the hole.
 *
 * Every field falls back rather than throwing: losing a preference is a far better outcome than a
 * page that will not start, which is the lesson of the unreadable-localStorage bug.
 */
export function validatePreferences(raw: unknown): PersistedPreferences {
  const saved = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<PersistedPreferences>;
  const location = isSelectedLocation(saved.location) ? saved.location : DEFAULT_LOCATION;

  return {
    cards: reconcileLayout(saved.cards),
    // Retired values ('light' | 'dark' | 'system', saved before themes existed) and anything unknown
    // land on the default theme rather than being rejected.
    theme: toThemeId(saved.theme),
    location,
    // Capped as well as filtered: the store's own action enforces the ceiling, but a hand-crafted
    // link would otherwise be free to stuff the chip row with hundreds of entries.
    savedLocations: Array.isArray(saved.savedLocations)
      ? saved.savedLocations.filter(isSelectedLocation).slice(0, MAX_SAVED_LOCATIONS)
      : [],
    // No saved choice yet falls back to a guess from the browser's own locale, not a US default —
    // this only ever runs client-side (merge, or a shared link someone opens), so `navigator` is
    // always present here despite the store's SSR-safe literal default below.
    unitSystem:
      saved.unitSystem === 'metric' || saved.unitSystem === 'imperial' ? saved.unitSystem : defaultUnitSystem(),
    activities: Array.isArray(saved.activities)
      ? [...new Set(saved.activities.filter(isActivityId))]
      : [],
    hasOnboarded: saved.hasOnboarded === true,
    // Absent in everything saved before version 12 and in every link written before Compare
    // existed; both simply mean "nothing to compare yet".
    compareLocation: compareLocationBeside(
      location,
      isSelectedLocation(saved.compareLocation) ? saved.compareLocation : null,
    ),
    compareLayout: isCompareLayout(saved.compareLayout) ? saved.compareLayout : DEFAULT_COMPARE_LAYOUT,
  };
}

/**
 * Storage that treats unreadable saved state as *no* saved state.
 *
 * zustand's default `createJSONStorage` calls `JSON.parse` unguarded, and `persist` handles the
 * resulting rejection by taking a catch branch that never sets `hasHydrated` and never notifies
 * its finish-hydration listeners. Since `useHasHydrated` is built on exactly those two things, and
 * the dashboard gates both the card grid and the weather request on it, one damaged byte in
 * localStorage left the page stuck on "Loading your dashboard…" forever — with no error, no retry,
 * and nothing to clear the bad value on the next visit either.
 *
 * Saved preferences are a convenience, so losing them is a far better outcome than a dead page:
 * anything unreadable is dropped and the app starts as it would for a first-time visitor. Writes
 * are guarded for the same reason — a browser that refuses to store data should cost the user
 * persistence, not the application.
 */
function createSafeStorage<S>(): PersistStorage<S> {
  const read = (name: string): StorageValue<S> | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(name);
      if (raw === null) return null;
      return JSON.parse(raw) as StorageValue<S>;
    } catch {
      // Drop the unreadable value rather than leaving it to fail again on every future visit.
      try {
        window.localStorage.removeItem(name);
      } catch {
        // Storage is unreadable *and* unwritable. Nothing more to do; defaults still apply.
      }
      return null;
    }
  };

  return {
    getItem: read,
    setItem: (name, value) => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(name, JSON.stringify(value));
      } catch {
        // Quota exceeded, or storage blocked. Preferences simply won't survive this session.
      }
    },
    removeItem: (name) => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.removeItem(name);
      } catch {
        // As above.
      }
    },
  };
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      location: DEFAULT_LOCATION,
      savedLocations: [],
      unitSystem: 'imperial',
      theme: DEFAULT_THEME,
      cards: DEFAULT_CARD_LAYOUT,
      activities: [],
      hasOnboarded: false,
      compareLocation: null,
      compareLayout: DEFAULT_COMPARE_LAYOUT,
      isEditing: false,
      isComparing: false,

      setLocation: (location) =>
        set((state) => ({ location, compareLocation: compareLocationBeside(location, state.compareLocation) })),
      resetLocation: () =>
        set((state) => ({
          location: DEFAULT_LOCATION,
          compareLocation: compareLocationBeside(DEFAULT_LOCATION, state.compareLocation),
        })),

      saveLocation: (location) =>
        set((state) => {
          if (state.savedLocations.some((saved) => saved.id === location.id)) return state;
          // Oldest drops off rather than refusing the save, which would feel like a broken button.
          return { savedLocations: [...state.savedLocations, location].slice(-MAX_SAVED_LOCATIONS) };
        }),

      removeSavedLocation: (id) =>
        set((state) => ({ savedLocations: state.savedLocations.filter((saved) => saved.id !== id) })),

      setUnitSystem: (unitSystem) => set({ unitSystem }),
      setTheme: (theme) => set({ theme }),

      // Arrange mode and Compare are exclusive both ways: Compare replaces the card grid, so
      // arranging while it shows would rearrange modules nobody can see.
      setEditing: (isEditing) => set(isEditing ? { isEditing, isComparing: false } : { isEditing }),
      setComparing: (isComparing) => set(isComparing ? { isComparing, isEditing: false } : { isComparing }),

      setCompareLocation: (compareLocation) =>
        set((state) =>
          compareLocation && isSamePlace(state.location, compareLocation) ? state : { compareLocation },
        ),
      setCompareLayout: (compareLayout) => set({ compareLayout }),

      swapCompareLocations: () =>
        set((state) =>
          state.compareLocation ? { location: state.compareLocation, compareLocation: state.location } : state,
        ),

      addCard: (id) =>
        set((state) =>
          state.cards.some((card) => card.id === id)
            ? state
            : { cards: [...state.cards, { id, size: defaultSizeFor(id) }] },
        ),

      removeCard: (id) => set((state) => ({ cards: state.cards.filter((card) => card.id !== id) })),

      toggleCard: (id) =>
        set((state) =>
          state.cards.some((card) => card.id === id)
            ? { cards: state.cards.filter((card) => card.id !== id) }
            : { cards: [...state.cards, { id, size: defaultSizeFor(id) }] },
        ),

      setCardSize: (id, size) =>
        set((state) => ({ cards: state.cards.map((card) => (card.id === id ? { ...card, size } : card)) })),

      cycleCardSize: (id) =>
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === id ? { ...card, size: CARD_SIZES[(CARD_SIZES.indexOf(card.size) + 1) % CARD_SIZES.length] } : card,
          ),
        })),

      reorderCards: (orderedIds) =>
        set((state) => {
          const byId = new Map(state.cards.map((card) => [card.id, card]));
          const reordered = orderedIds
            .map((id) => byId.get(id))
            .filter((card): card is CardLayoutEntry => card !== undefined);
          // Guard against a partial id list silently dropping cards.
          return reordered.length === state.cards.length ? { cards: reordered } : state;
        }),

      applyPreset: (presetId) =>
        set((state) => {
          const preset = LAYOUT_PRESETS.find((candidate) => candidate.id === presetId);
          return preset ? { cards: preset.layout } : state;
        }),

      restoreDefaults: () => set({ cards: DEFAULT_CARD_LAYOUT }),

      setActivities: (activities) => set({ activities: [...new Set(activities)] }),

      // A remembered compare place survives redoing setup, as saved locations do — unless the
      // new home location is that very place.
      completeOnboarding: ({ location, activities, cards }) =>
        set((state) => ({
          location,
          compareLocation: compareLocationBeside(location, state.compareLocation),
          activities: [...new Set(activities)],
          cards: reconcileLayout(cards),
          hasOnboarded: true,
        })),

      // Skipping is a real answer, not an absence of one: the flow must not reappear next visit.
      skipOnboarding: () => set({ hasOnboarded: true }),

      restartOnboarding: () => set({ hasOnboarded: false }),

      applyPreferences: (preferences) => set({ ...validatePreferences(preferences), hasOnboarded: true }),
    }),
    {
      name: DASHBOARD_STORAGE_KEY,
      storage: createSafeStorage(),
      // Hydration should never fail now, but if it somehow does, say so rather than leaving a
      // silent stall — that silence is what made the original bug so hard to notice.
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.error('[dashboard] could not restore saved preferences:', error);
      },
      // Bump when the persisted shape changes so old saved state is never deserialized into a
      // shape the code no longer understands. 12 added `compareLocation` and `compareLayout`;
      // state saved before them passes through `migrate` untouched and `validatePreferences` fills
      // in "nothing to compare" and the default layout.
      version: 12,
      // Without a migrate, zustand *discards* state saved under an older version — which would
      // throw away every existing dashboard on upgrade and make reconcileLayout's span-to-size
      // translation dead code. Older state is handed through instead, because `merge` below
      // re-validates every field it cares about anyway.
      migrate: (persisted, version) => {
        // Anyone holding state from before onboarding existed has already arranged their dashboard
        // by hand. Defaulting them to "not yet onboarded" would greet a returning user with a
        // first-run wall over the dashboard they already built, so they are marked done.
        if (version < 7 && typeof persisted === 'object' && persisted !== null) {
          return { ...persisted, hasOnboarded: true } as DashboardState;
        }
        return persisted as DashboardState;
      },
      // Persist preferences only. Actions are unserializable; isEditing and isComparing are transient.
      partialize: (state): PersistedPreferences => ({
        location: state.location,
        savedLocations: state.savedLocations,
        unitSystem: state.unitSystem,
        theme: state.theme,
        cards: state.cards,
        activities: state.activities,
        hasOnboarded: state.hasOnboarded,
        compareLocation: state.compareLocation,
        compareLayout: state.compareLayout,
      }),
      // Every persisted field is re-validated rather than trusted, because `migrate` above
      // deliberately lets state written by older versions through. A stored layout can reference
      // modules this version no longer has (or miss ones it gained); the theme is read by a
      // pre-paint script that must not be handed nonsense; and a location with a missing
      // coordinate would be sent straight to the weather route as a request for "null island".
      //
      // The validation itself lives in `validatePreferences` because a shared setup link has to run
      // the very same checks on a payload a stranger may have written.
      merge: (persisted, current) => ({ ...current, ...validatePreferences(persisted) }),
      // Critical for SSR correctness: without this, the store reads localStorage while the module
      // initializes, so the client's first render differs from the server-rendered HTML and React
      // reports a hydration mismatch. Instead we rehydrate explicitly after mount (see
      // useHasHydrated), which keeps the first client render identical to the server's.
      skipHydration: true,
    },
  ),
);
