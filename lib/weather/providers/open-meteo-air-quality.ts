import {
  openMeteoAirQualityResponseSchema,
  openMeteoErrorResponseSchema,
  type OpenMeteoAirQualityResponse,
} from '../schemas';

// A different host from the forecast API, not just a different path.
const OPEN_METEO_AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const CURRENT_VARIABLES = [
  'us_aqi',
  'european_aqi',
  'pm2_5',
  'pm10',
  'ozone',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'carbon_monoxide',
] as const;

export class OpenMeteoAirQualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenMeteoAirQualityError';
  }
}

export interface OpenMeteoAirQualityParams {
  latitude: number;
  longitude: number;
  /** IANA timezone name or "auto". */
  timezone: string;
}

export function buildOpenMeteoAirQualityUrl({ latitude, longitude, timezone }: OpenMeteoAirQualityParams): string {
  const url = new URL(OPEN_METEO_AIR_QUALITY_URL);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', CURRENT_VARIABLES.join(','));
  url.searchParams.set('timezone', timezone);
  return url.toString();
}

/**
 * Fetches and validates current air quality. Mirrors the forecast provider: injectable `fetch`,
 * a single domain error type, and transport failures wrapped so callers never see a raw TypeError.
 */
export async function fetchOpenMeteoAirQuality(
  params: OpenMeteoAirQualityParams,
  fetchImpl: typeof fetch = fetch,
): Promise<OpenMeteoAirQualityResponse> {
  let response: Response;
  try {
    response = await fetchImpl(buildOpenMeteoAirQualityUrl(params));
  } catch (error) {
    throw new OpenMeteoAirQualityError(
      `Could not reach Open-Meteo air quality: ${error instanceof Error ? error.message : 'network error'}`,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new OpenMeteoAirQualityError(`Open-Meteo air quality response was not valid JSON (status ${response.status})`);
  }

  if (!response.ok) {
    const errorBody = openMeteoErrorResponseSchema.safeParse(json);
    const reason = errorBody.success ? errorBody.data.reason : `request failed with status ${response.status}`;
    throw new OpenMeteoAirQualityError(`Open-Meteo air quality error: ${reason}`);
  }

  const parsed = openMeteoAirQualityResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new OpenMeteoAirQualityError(`Open-Meteo air quality response failed validation: ${parsed.error.message}`);
  }

  return parsed.data;
}
