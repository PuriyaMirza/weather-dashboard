import { openMeteoErrorResponseSchema, openMeteoForecastResponseSchema, type OpenMeteoForecastResponse } from '../schemas';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// current/hourly/daily variable lists are intentionally narrow — only what normalize-open-meteo.ts
// consumes. Open-Meteo only returns keys for variables that were requested.
const CURRENT_VARIABLES = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'pressure_msl',
  'cloud_cover',
  // Drives the day/night atmosphere. Cheaper and more reliable than comparing timestamps against
  // sunrise/sunset, which needs care around timezones and polar day/night.
  'is_day',
] as const;

const HOURLY_VARIABLES = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'dew_point_2m',
  'uv_index',
  'visibility',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'cloud_cover',
  'pressure_msl',
] as const;

const DAILY_VARIABLES = [
  'temperature_2m_max',
  'temperature_2m_min',
  'weather_code',
  'sunrise',
  'sunset',
  'daylight_duration',
  'uv_index_max',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
] as const;

// A week of data: enough for the daily forecast card. Hourly variables are returned for the same
// span, so the hourly series is trimmed during normalization rather than over-fetched per card.
const FORECAST_DAYS = 7;

export interface OpenMeteoForecastParams {
  latitude: number;
  longitude: number;
  /** IANA timezone name (e.g. "America/Los_Angeles") or "auto". */
  timezone: string;
}

export class OpenMeteoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenMeteoError';
  }
}

export function buildOpenMeteoForecastUrl({ latitude, longitude, timezone }: OpenMeteoForecastParams): string {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', CURRENT_VARIABLES.join(','));
  url.searchParams.set('hourly', HOURLY_VARIABLES.join(','));
  url.searchParams.set('daily', DAILY_VARIABLES.join(','));
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('precipitation_unit', 'inch');
  url.searchParams.set('timezone', timezone);
  url.searchParams.set('forecast_days', String(FORECAST_DAYS));
  return url.toString();
}

/**
 * Fetches and validates a forecast from Open-Meteo. `fetchImpl` is injectable so tests can
 * supply a fake implementation instead of hitting the network.
 */
export async function fetchOpenMeteoForecast(
  params: OpenMeteoForecastParams,
  fetchImpl: typeof fetch = fetch,
): Promise<OpenMeteoForecastResponse> {
  // A transport-level failure (DNS, refused connection, timeout) rejects before any Response
  // exists. Wrap it so callers only ever see OpenMeteoError and route handlers can keep their
  // error shape consistent instead of surfacing a raw TypeError as a 500.
  let response: Response;
  try {
    response = await fetchImpl(buildOpenMeteoForecastUrl(params));
  } catch (error) {
    throw new OpenMeteoError(`Could not reach Open-Meteo: ${error instanceof Error ? error.message : 'network error'}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new OpenMeteoError(`Open-Meteo response was not valid JSON (status ${response.status})`);
  }

  if (!response.ok) {
    const errorBody = openMeteoErrorResponseSchema.safeParse(json);
    const reason = errorBody.success ? errorBody.data.reason : `request failed with status ${response.status}`;
    throw new OpenMeteoError(`Open-Meteo error: ${reason}`);
  }

  const parsed = openMeteoForecastResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new OpenMeteoError(`Open-Meteo response failed validation: ${parsed.error.message}`);
  }

  return parsed.data;
}
