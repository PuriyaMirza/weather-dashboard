/**
 * Where in the park an outing happened. These are eBird's own Central Park sub-hotspot names
 * (as they appear in live reports, "Central Park--The Ramble"), so an exported checklist lands on
 * the right hotspot when imported. "Central Park (general)" covers a walk through several areas.
 */
export const PARK_AREAS = [
  'Central Park (general)',
  'The Ramble',
  'North End (N of 97th St. Transverse)',
  'The Pool',
  'Harlem Meer',
  'North Meadow',
  'West of Reservoir (86th-97th St.)',
  'Arthur Ross Pinetum',
  'Maintenance Meadow',
  'Evodia Field',
  'Greywacke Arch',
  'Met Museum (E Drive; 79th-85th St. transv.)',
  'Falconers Hill',
  'South Blowdown Meadow',
  'The Pond and Hallett Sanctuary',
  'Tennis Center and vicinity',
  'Compost Area',
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
