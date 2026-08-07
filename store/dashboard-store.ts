import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LOCATION, type SelectedLocation } from '@/lib/weather/location';
import type { UnitSystem } from '@/lib/weather/units';

export interface DashboardState {
  location: SelectedLocation;
  unitSystem: UnitSystem;
  setLocation: (location: SelectedLocation) => void;
  resetLocation: () => void;
  setUnitSystem: (unitSystem: UnitSystem) => void;
}

export const DASHBOARD_STORAGE_KEY = 'weather-dashboard';

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      location: DEFAULT_LOCATION,
      unitSystem: 'imperial',
      setLocation: (location) => set({ location }),
      resetLocation: () => set({ location: DEFAULT_LOCATION }),
      setUnitSystem: (unitSystem) => set({ unitSystem }),
    }),
    {
      name: DASHBOARD_STORAGE_KEY,
      // Bump when the persisted shape changes so old saved state is discarded rather than
      // deserialized into a shape the code no longer understands.
      version: 2,
      // Persist data only — re-persisting action functions would be meaningless and unserializable.
      partialize: (state) => ({ location: state.location, unitSystem: state.unitSystem }),
      // Critical for SSR correctness: without this, the store reads localStorage while the module
      // initializes, so the client's first render differs from the server-rendered HTML and React
      // reports a hydration mismatch. Instead we rehydrate explicitly after mount (see
      // useHasHydrated), which keeps the first client render identical to the server's.
      skipHydration: true,
    },
  ),
);
