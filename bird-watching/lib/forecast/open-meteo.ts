import { z } from 'zod';
import { fetchJson } from '@/lib/api/http';
import { withTimeout } from '@/lib/api/request-timeout';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
export const PARK = { latitude: 40.7812, longitude: -73.9665, timezone: 'America/New_York' };

const HOURLY = ['temperature_2m', 'precipitation_probability', 'precipitation', 'wind_speed_10m', 'wind_direction_10m', 'cloud_cover'] as const;
const DAILY = ['sunrise', 'sunset'] as const;

const nullableNumbers = z.array(z.number().nullable());

export const forecastResponseSchema = z.object({
  timezone: z.string(),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: nullableNumbers,
    precipitation_probability: nullableNumbers,
    precipitation: nullableNumbers,
    wind_speed_10m: nullableNumbers,
    wind_direction_10m: nullableNumbers,
    cloud_cover: nullableNumbers,
  }),
  daily: z.object({
    time: z.array(z.string()),
    sunrise: z.array(z.string()),
    sunset: z.array(z.string()),
  }),
});

export type ForecastResponse = z.infer<typeof forecastResponseSchema>;

export function buildForecastUrl(): string {
  const url = new URL(OPEN_METEO);
  url.searchParams.set('latitude', String(PARK.latitude));
  url.searchParams.set('longitude', String(PARK.longitude));
  url.searchParams.set('timezone', PARK.timezone);
  url.searchParams.set('hourly', HOURLY.join(','));
  url.searchParams.set('daily', DAILY.join(','));
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('precipitation_unit', 'inch');
  // Yesterday is needed for last night's winds: they decide what landed in the park this morning.
  url.searchParams.set('past_days', '1');
  url.searchParams.set('forecast_days', '3');
  return url.toString();
}

export async function fetchParkForecast(fetchImpl: typeof fetch = fetch): Promise<ForecastResponse> {
  return fetchJson(buildForecastUrl(), (json) => forecastResponseSchema.safeParse(json), withTimeout(), fetchImpl);
}
