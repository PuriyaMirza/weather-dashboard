import { openMeteoErrorResponseSchema, openMeteoGeocodingResponseSchema, type OpenMeteoGeocodingResult } from '../schemas';

const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export class OpenMeteoGeocodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenMeteoGeocodingError';
  }
}

export interface OpenMeteoGeocodingParams {
  name: string;
  count?: number;
  language?: string;
}

export function buildOpenMeteoGeocodingUrl({ name, count = 5, language = 'en' }: OpenMeteoGeocodingParams): string {
  const url = new URL(OPEN_METEO_GEOCODING_URL);
  url.searchParams.set('name', name);
  url.searchParams.set('count', String(count));
  url.searchParams.set('language', language);
  url.searchParams.set('format', 'json');
  return url.toString();
}

/**
 * Searches for locations matching `name` and returns candidate results (best match first).
 * Returns an empty array rather than throwing when nothing matches. `fetchImpl` is injectable
 * so tests can supply a fake implementation instead of hitting the network.
 */
export async function fetchOpenMeteoGeocoding(
  params: OpenMeteoGeocodingParams,
  fetchImpl: typeof fetch = fetch,
): Promise<OpenMeteoGeocodingResult[]> {
  const response = await fetchImpl(buildOpenMeteoGeocodingUrl(params));

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new OpenMeteoGeocodingError(`Open-Meteo geocoding response was not valid JSON (status ${response.status})`);
  }

  if (!response.ok) {
    const errorBody = openMeteoErrorResponseSchema.safeParse(json);
    const reason = errorBody.success ? errorBody.data.reason : `request failed with status ${response.status}`;
    throw new OpenMeteoGeocodingError(`Open-Meteo geocoding error: ${reason}`);
  }

  const parsed = openMeteoGeocodingResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new OpenMeteoGeocodingError(`Open-Meteo geocoding response failed validation: ${parsed.error.message}`);
  }

  return parsed.data.results ?? [];
}
