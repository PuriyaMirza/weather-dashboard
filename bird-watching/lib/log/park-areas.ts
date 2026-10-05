/**
 * Where in the park an outing happened. Names follow eBird's Central Park sub-hotspots
 * ("Central Park--The Ramble"), so an exported checklist lines up with the right hotspot when
 * imported. "Central Park (general)" covers a walk through several areas.
 */
export const PARK_AREAS = [
  'Central Park (general)',
  'The Ramble',
  'North Woods',
  'Jacqueline Kennedy Onassis Reservoir',
  'Turtle Pond',
  'Shakespeare Garden',
  'Strawberry Fields',
  'Hallett Nature Sanctuary',
  'The Pond',
  'Harlem Meer',
  'Conservatory Garden',
  'The Lake',
  'Great Lawn',
  'North Meadow',
] as const;

export const DEFAULT_AREA = PARK_AREAS[0];

/** eBird's location name for an area. */
export function ebirdLocationName(area: string): string {
  return area === DEFAULT_AREA ? 'Central Park' : `Central Park--${area}`;
}

/**
 * Used on export when the outing has no shared location. The middle of the park — eBird's import
 * lets you re-match the location to the exact hotspot.
 */
export const PARK_CENTER = { latitude: 40.7812, longitude: -73.9665 };
