import { sizeClassOf, type SizeClass } from './labels';
import type { FieldColor, Habitat, Species, SpeciesOption } from './schema';

export interface GuideFilters {
  query: string;
  /** All selected colours must appear on the bird — "red and black" narrows, it doesn't widen. */
  colors: FieldColor[];
  /** Any selected size matches; people are rarely sure between two neighbouring sizes. */
  sizes: SizeClass[];
  /** Any selected habitat matches. */
  habitats: Habitat[];
  family: string | null;
}

export const EMPTY_FILTERS: GuideFilters = { query: '', colors: [], sizes: [], habitats: [], family: null };

/** Lowercase, accents stripped, hyphens/apostrophes treated as spaces: "Cooper's" ≈ "coopers". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * How well a species matches a typed query; lower is better, null is no match. A four-letter
 * banding code (AMRO) is how experienced birders jot notes, so an exact code match ranks first.
 */
export function matchRank(species: SpeciesOption, rawQuery: string): number | null {
  const query = normalize(rawQuery);
  if (!query) return 0;
  const name = normalize(species.commonName);
  if (species.bandingCode && query === species.bandingCode.toLowerCase()) return 0;
  if (name === query) return 1;
  if (name.startsWith(query)) return 2;
  if (name.split(' ').some((word) => word.startsWith(query))) return 3;
  if (name.includes(query)) return 4;
  if (normalize(species.scientificName).includes(query)) return 5;
  if (normalize(species.family).includes(query)) return 6;
  return null;
}

export function hasActiveFilters(filters: GuideFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.colors.length > 0 ||
    filters.sizes.length > 0 ||
    filters.habitats.length > 0 ||
    filters.family !== null
  );
}

/** Filters, then orders by match quality (when searching) with taxonomic order as tiebreak. */
export function filterSpecies(species: Species[], filters: GuideFilters): Species[] {
  const ranked: { species: Species; rank: number }[] = [];
  for (const s of species) {
    if (filters.family && s.family !== filters.family) continue;
    if (!filters.colors.every((c) => s.colors.includes(c))) continue;
    if (filters.habitats.length > 0 && !filters.habitats.some((h) => s.habitats.includes(h))) continue;
    if (filters.sizes.length > 0) {
      const size = sizeClassOf(s.lengthIn);
      if (!size || !filters.sizes.includes(size)) continue;
    }
    const rank = matchRank(s, filters.query);
    if (rank !== null) ranked.push({ species: s, rank });
  }
  return ranked.sort((a, b) => a.rank - b.rank || a.species.taxonOrder - b.species.taxonOrder).map((r) => r.species);
}

/** Top matches for a quick-add box: best match first, taxonomic order within a rank. */
export function quickMatches<T extends SpeciesOption>(options: T[], query: string, limit = 6): T[] {
  if (!normalize(query)) return [];
  return options
    .map((option) => ({ option, rank: matchRank(option, query) }))
    .filter((r): r is { option: T; rank: number } => r.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.option.taxonOrder - b.option.taxonOrder)
    .slice(0, limit)
    .map((r) => r.option);
}
