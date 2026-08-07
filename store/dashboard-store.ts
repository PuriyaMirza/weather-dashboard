import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeatherCardId } from '@/components/weather/card-registry';
import {
  DEFAULT_CARD_LAYOUT,
  moveEntry,
  reconcileLayout,
  type CardLayoutEntry,
  type CardSpan,
} from '@/lib/weather/card-layout';
import { DEFAULT_LOCATION, type SelectedLocation } from '@/lib/weather/location';
import type { UnitSystem } from '@/lib/weather/units';

export interface DashboardState {
  location: SelectedLocation;
  unitSystem: UnitSystem;
  cards: CardLayoutEntry[];
  /** Transient UI state — deliberately not persisted, so a reload never starts in edit mode. */
  isEditing: boolean;

  setLocation: (location: SelectedLocation) => void;
  resetLocation: () => void;
  setUnitSystem: (unitSystem: UnitSystem) => void;

  setEditing: (isEditing: boolean) => void;
  addCard: (id: WeatherCardId) => void;
  removeCard: (id: WeatherCardId) => void;
  setCardSpan: (id: WeatherCardId, span: CardSpan) => void;
  /** Moves a card one position earlier (-1) or later (+1); a no-op at the ends. */
  moveCard: (id: WeatherCardId, direction: -1 | 1) => void;
  /** Reorders to an explicit id sequence — used by drag-and-drop. */
  reorderCards: (orderedIds: WeatherCardId[]) => void;
  restoreDefaults: () => void;
}

export const DASHBOARD_STORAGE_KEY = 'weather-dashboard';

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      location: DEFAULT_LOCATION,
      unitSystem: 'imperial',
      cards: DEFAULT_CARD_LAYOUT,
      isEditing: false,

      setLocation: (location) => set({ location }),
      resetLocation: () => set({ location: DEFAULT_LOCATION }),
      setUnitSystem: (unitSystem) => set({ unitSystem }),

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

      restoreDefaults: () => set({ cards: DEFAULT_CARD_LAYOUT }),
    }),
    {
      name: DASHBOARD_STORAGE_KEY,
      // Bump when the persisted shape changes so old saved state is discarded rather than
      // deserialized into a shape the code no longer understands.
      version: 3,
      // Persist preferences only. Actions are unserializable, and isEditing is transient.
      partialize: (state) => ({
        location: state.location,
        unitSystem: state.unitSystem,
        cards: state.cards,
      }),
      // A stored layout can reference cards this version no longer has (or miss ones it gained),
      // so it is reconciled against the registry instead of trusted as-is.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<DashboardState>;
        return {
          ...current,
          ...saved,
          cards: reconcileLayout(saved.cards),
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
