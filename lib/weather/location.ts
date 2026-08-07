import type { OpenMeteoGeocodingResult } from './schemas';

/**
 * A location the user has chosen. Deliberately a flat, serializable shape: it is persisted to
 * browser storage, so it must survive JSON round-tripping and schema versioning.
 */
export interface SelectedLocation {
  /** Stable identity for React keys and de-duplication. Geocoding ids are numbers; "current" is used for geolocation. */
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}

export const DEFAULT_LOCATION: SelectedLocation = {
  id: '5746545',
  name: 'Portland',
  region: 'Oregon',
  country: 'United States',
  latitude: 45.5152,
  longitude: -122.6784,
};

export function geocodingResultToLocation(result: OpenMeteoGeocodingResult): SelectedLocation {
  return {
    id: String(result.id),
    name: result.name,
    region: result.admin1 ?? '',
    country: result.country ?? '',
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

/** Label for the location chip, skipping empty administrative fields rather than rendering ", ,". */
export function formatLocationLabel(location: SelectedLocation): string {
  return [location.name, location.region, location.country].filter(Boolean).join(', ');
}

/**
 * Browser geolocation gives coordinates but no place name, and Open-Meteo's geocoding API is
 * forward-only (name to coordinates), so there is nothing to reverse-look-up the name with.
 * The location is labelled generically; the forecast itself is unaffected because the weather
 * request resolves its timezone from the coordinates.
 */
export function coordinatesToLocation(latitude: number, longitude: number): SelectedLocation {
  return { id: 'current', name: 'Current location', region: '', country: '', latitude, longitude };
}
