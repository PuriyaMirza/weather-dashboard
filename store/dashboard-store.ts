import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import type { WeatherCardId } from '@/components/weather/card-registry';
import {
  DEFAULT_CARD_LAYOUT,
  LAYOUT_PRESETS,
  CARD_SIZES,
  defaultSizeFor,
  moveEntry,
  reconcileLayout,
  type CardLayoutEntry,
  type CardSize,
} from '@/lib/weather/card-layout';
import { isActivityId, type ActivityId } from '@/lib/weather/activity-windows';
import { DEFAULT_LOCATION, type SelectedLocation } from '@/lib/weather/location';
import { isThemePreference, type ThemePreference } from '@/lib/theme';
import { defaultUnitSystem, type UnitSystem } from '@/lib/weather/units';

/** Keeps the saved list from growing without bound and the chip row from wrapping endlessly. */
export const MAX_SAVED_LOCATIONS = 8;

export const DEFAULT_THEME: ThemePreference = 'system';

/**
 * The preference fields that outlive the session — everything `partialize` writes, and everything a
 * shared setup link can carry. Kept as its own type because both paths validate against it.
 */
export interface PersistedPreferences {
  location: SelectedLocation;
  savedLocations: SelectedLocation[];
  unitSystem: UnitSystem;
  theme: ThemePreference;
  cards: CardLayoutEntry[];
  activities: ActivityId[];
  hasOnboarded: boolean;
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

  setLocation: (location: SelectedLocation) => void;
  resetLocation: () => void;
  saveLocation: (location: SelectedLocation) => void;
  removeSavedLocation: (id: string) => void;

  setUnitSystem: (unitSystem: UnitSystem) => void;
  setTheme: (theme: ThemePreference) => void;

  setEditing: (isEditing: boolean) => void;
  addCard: (id: WeatherCardId) => void;
  removeCard: (id: WeatherCardId) => void;
  /** Adds the module if it is absent, removes it if present — what the menu's toggle list needs. */
  toggleCard: (id: WeatherCardId) => void;
  setCardSize: (id: WeatherCardId, size: CardSize) => void;
  /** Advances a module to the next size, wrapping large back round to small. */
  cycleCardSize: (id: WeatherCardId) => void;
  /** Moves a card one position earlier (-1) or later (+1); a no-op at the ends. */
  moveCard: (id: WeatherCardId, direction: -1 | 1) => void;
  /** Reorders to an explicit id sequence — used by drag-and-drop. */
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

  return {
    cards: reconcileLayout(saved.cards),
    // Falls back to the constant rather than the live store value, which at rehydrate time is not
    // necessarily the default.
    theme: isThemePreference(saved.theme) ? saved.theme : DEFAULT_THEME,
    location: isSelectedLocation(saved.location) ? saved.location : DEFAULT_LOCATION,
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
      isEditing: false,

      setLocation: (location) => set({ location }),
      resetLocation: () => set({ location: DEFAULT_LOCATION }),

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

      setEditing: (isEditing) => set({ isEditing }),

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

      moveCard: (id, direction) =>
        set((state) => {
          const from = state.cards.findIndex((card) => card.id === id);
          if (from < 0) return state;
          const to = from + direction;
          if (to < 0 || to >= state.cards.length) return state;
          return { cards: moveEntry(state.cards, from, to) };
        }),

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

      completeOnboarding: ({ location, activities, cards }) =>
        set({
          location,
          activities: [...new Set(activities)],
          cards: reconcileLayout(cards),
          hasOnboarded: true,
        }),

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
      // shape the code no longer understands.
      version: 7,
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
      // Persist preferences only. Actions are unserializable, and isEditing is transient.
      partialize: (state) => ({
        location: state.location,
        savedLocations: state.savedLocations,
        unitSystem: state.unitSystem,
        theme: state.theme,
        cards: state.cards,
        activities: state.activities,
        hasOnboarded: state.hasOnboarded,
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
