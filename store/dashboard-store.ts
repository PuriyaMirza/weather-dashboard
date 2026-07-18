import { create } from 'zustand';

interface DashboardState {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedCity: 'Portland',
  setSelectedCity: (city) => set({ selectedCity: city }),
}));
