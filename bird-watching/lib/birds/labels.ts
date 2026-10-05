import type { FieldColor, Habitat } from './schema';

/**
 * Size relative to birds everyone already knows. Beginners judge size by comparison, not by
 * inches, so the guide filters and describes size this way and shows inches as a secondary fact.
 */
export const SIZE_CLASSES = ['tiny', 'sparrow', 'robin', 'crow', 'large'] as const;
export type SizeClass = (typeof SIZE_CLASSES)[number];

export const SIZE_LABEL: Record<SizeClass, string> = {
  tiny: 'Smaller than a sparrow',
  sparrow: 'About sparrow-sized',
  robin: 'About robin-sized',
  crow: 'Pigeon- to crow-sized',
  large: 'Larger than a crow',
};

// Upper bounds on mid-length in inches. House Sparrow ≈ 6.3, American Robin ≈ 9.5, Blue Jay ≈ 10.8,
// American Crow ≈ 18.4 — each yardstick bird lands in the class people would expect.
const SIZE_UPPER_BOUNDS: [SizeClass, number][] = [
  ['tiny', 5.6],
  ['sparrow', 7.6],
  ['robin', 11],
  ['crow', 20],
];

/** Null when the species has no measured length — the guide never guesses a size. */
export function sizeClassOf(lengthIn: readonly [number, number] | null): SizeClass | null {
  if (!lengthIn) return null;
  const mid = (lengthIn[0] + lengthIn[1]) / 2;
  return SIZE_UPPER_BOUNDS.find(([, bound]) => mid < bound)?.[0] ?? 'large';
}

export function formatLength(lengthIn: readonly [number, number]): string {
  const [min, max] = lengthIn;
  return min === max ? `${min} in` : `${min}–${max} in`;
}

export const COLOR_LABEL: Record<FieldColor, string> = {
  black: 'Black',
  white: 'White',
  gray: 'Gray',
  brown: 'Brown',
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
};

export const HABITAT_LABEL: Record<Habitat, string> = {
  woodland: 'Woods',
  water: 'On or by water',
  lawns: 'Lawns & open ground',
  thickets: 'Shrubs & thickets',
  feeders: 'At feeders',
  overhead: 'Flying overhead',
};

/**
 * Swatches for the colour filter. These are the birds' colours, not theme colours — data, not
 * design tokens — and always sit beside the colour's name.
 */
export const COLOR_SWATCH: Record<FieldColor, string> = {
  black: '#111111',
  white: '#f5f5f5',
  gray: '#8a8f93',
  brown: '#8b5a2b',
  red: '#d32f2f',
  orange: '#ef7d22',
  yellow: '#f6d32d',
  green: '#4f8a3a',
  blue: '#3b6fd8',
};
