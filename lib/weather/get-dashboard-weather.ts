import { normalizeOpenMeteoForecast } from './normalize-open-meteo';
import { fetchOpenMeteoForecast, OpenMeteoError } from './providers/open-meteo';
import { fetchOpenMeteoGeocoding, OpenMeteoGeocodingError } from './providers/open-meteo-geocoding';
import type { WeatherDashboardData } from './types';

export class WeatherLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeatherLookupError';
  }
}

/**
 * Resolves a place name to coordinates and fetches its current forecast — the one shared
 * request per forecast that all cards are built from. Geocoding timezone is intentionally
 * unused: the forecast request passes timezone "auto", which Open-Meteo resolves from the
 * coordinates and echoes back, so there's no need to trust a second, separate timezone field.
 */
export async function getWeatherForPlaceName(placeName: string): Promise<WeatherDashboardData> {
  let results;
  try {
    results = await fetchOpenMeteoGeocoding({ name: placeName, count: 1 });
  } catch (error) {
    if (error instanceof OpenMeteoGeocodingError) {
      throw new WeatherLookupError(`Could not look up "${placeName}": ${error.message}`);
    }
    throw error;
  }

  const match = results[0];
  if (!match) {
    throw new WeatherLookupError(`No location found for "${placeName}".`);
  }

  let forecast;
  try {
    forecast = await fetchOpenMeteoForecast({
      latitude: match.latitude,
      longitude: match.longitude,
      timezone: 'auto',
    });
  } catch (error) {
    if (error instanceof OpenMeteoError) {
      throw new WeatherLookupError(`Could not fetch weather for "${placeName}": ${error.message}`);
    }
    throw error;
  }

  return normalizeOpenMeteoForecast(forecast, {
    name: match.name,
    region: match.admin1 ?? '',
    country: match.country ?? '',
  });
}
