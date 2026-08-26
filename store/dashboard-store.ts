import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeatherCardId } from '@/components/weather/card-registry';
import {
  DEFAULT_CARD_LAYOUT,
  LAYOUT_PRESETS,
  moveEntry,
  reconcileLayout,
  type CardLayoutEntry,
  type CardSpan,
} from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION, type SelectedLocation } from '@/lib/weather/location';
import { isThemePreference, type ThemePreference } from '@/lib/theme';
import type { UnitSystem } from '@/lib/weather/units';

/** Keeps the saved list from growing without bound and the chip row from wrapping endlessly. */
export const MAX_SAVED_LOCATIONS = 8;

export const DEFAULT_THEME: ThemePreference = 'system';

export interface DashboardState {
  location: SelectedLocation;
  savedLocations: SelectedLocation[];
  unitSystem: UnitSystem;
  theme: ThemePreference;
  cards: CardLayoutEntry[];
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
  setCardSpan: (id: WeatherCardId, span: CardSpan) => void;
  /** Moves a card one position earlier (-1) or later (+1); a no-op at the ends. */
  moveCard: (id: WeatherCardId, direction: -1 | 1) => void;
  /** Reorders to an explicit id sequence — used by drag-and-drop. */
  reorderCards: (orderedIds: WeatherCardId[]) => void;
  applyPreset: (presetId: string) => void;
  restoreDefaults: () => void;
}

export const DASHBOARD_STORAGE_KEY = 'weather-dashboard';

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      location: DEFAULT_LOCATION,
      savedLocations: [],
      unitSystem: 'imperial',
      theme: DEFAULT_THEME,
      cards: DEFAULT_CARD_LAYOUT,
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
            : { cards: [...state.cards, { id, span: 'single' as CardSpan }] },
        ),

      removeCard: (id) => set((state) => ({ cards: state.cards.filter((card) => card.id !== id) })),

      setCardSpan: (id, span) =>
        set((state) => ({ cards: state.cards.map((card) => (card.id === id ? { ...card, span } : card)) })),

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
    }),
    {
      name: DASHBOARD_STORAGE_KEY,
      // Bump when the persisted shape changes so old saved state is discarded rather than
      // deserialized into a shape the code no longer understands.
      version: 4,
      // Persist preferences only. Actions are unserializable, and isEditing is transient.
      partialize: (state) => ({
        location: state.location,
        savedLocations: state.savedLocations,
        unitSystem: state.unitSystem,
        theme: state.theme,
        cards: state.cards,
      }),
      // A stored layout can reference cards this version no longer has (or miss ones it gained),
      // so it is reconciled against the registry instead of trusted as-is. The theme is validated
      // for the same reason: it is read by a pre-paint script that must not be handed nonsense.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<DashboardState>;
        return {
          ...current,
          ...saved,
          cards: reconcileLayout(saved.cards),
          // Falls back to the constant rather than `current.theme`: merge runs against whatever
          // the store happens to hold at rehydrate time, which is not necessarily the default.
          theme: isThemePreference(saved.theme) ? saved.theme : DEFAULT_THEME,
          savedLocations: Array.isArray(saved.savedLocations) ? saved.savedLocations : [],
        };
      },
      // Critical for SSR correctness: without this, the store reads localStorage while the module
      // initializes, so the client's first render differs from the server-rendered HTML and React
      // reports a hydration mismatch. Instead we rehydrate explicitly after mount (see
      // useHasHydrated), which keeps the first client render identical to the server's.
      skipHydration: true,
    },
  ),
);
