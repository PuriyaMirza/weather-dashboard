import { create } from 'zustand';
import { EMPTY_FILTERS, type GuideFilters } from '@/lib/birds/search';

interface GuideFiltersState extends GuideFilters {
  setFilters: (patch: Partial<GuideFilters>) => void;
  reset: () => void;
}

/**
 * The guide's search and filters, held in memory only. Lives outside the component so that
 * opening a species and coming back keeps your search — but a fresh visit starts clean, which is
 * what you want in the field.
 */
export const useGuideFiltersStore = create<GuideFiltersState>()((set) => ({
  ...EMPTY_FILTERS,
  setFilters: (patch) => set(patch),
  reset: () => set(EMPTY_FILTERS),
}));
