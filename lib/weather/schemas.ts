import { z } from 'zod';

// Schemas model exactly the variables our provider requests (see providers/open-meteo.ts),
// not Open-Meteo's full variable catalog. Nullable numbers reflect that any variable can come
// back null for a given hour/day when the underlying model has no data for it.
const nullableNumber = z.number().nullable();
const nullableNumberArray = z.array(nullableNumber);

export const openMeteoCurrentSchema = z.object({
  time: z.string(),
  interval: z.number(),
  temperature_2m: nullableNumber,
  apparent_temperature: nullableNumber,
  relative_humidity_2m: nullableNumber,
  weather_code: nullableNumber,
  wind_speed_10m: nullableNumber,
  wind_direction_10m: nullableNumber,
  wind_gusts_10m: nullableNumber,
  pressure_msl: nullableNumber,
  cloud_cover: nullableNumber,
});

export const openMeteoHourlySchema = z
  .object({
    time: z.array(z.string()),
    temperature_2m: nullableNumberArray,
    apparent_temperature: nullableNumberArray,
    precipitation_probability: nullableNumberArray,
    precipitation: nullableNumberArray,
    weather_code: nullableNumberArray,
    dew_point_2m: nullableNumberArray,
    uv_index: nullableNumberArray,
    visibility: nullableNumberArray,
    wind_speed_10m: nullableNumberArray,
    wind_gusts_10m: nullableNumberArray,
    wind_direction_10m: nullableNumberArray,
    cloud_cover: nullableNumberArray,
    pressure_msl: nullableNumberArray,
  })
  .superRefine((hourly, ctx) => {
    const variableKeys = [
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

    for (const key of variableKeys) {
      if (hourly[key].length !== hourly.time.length) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `hourly.${key} length (${hourly[key].length}) does not match hourly.time length (${hourly.time.length})`,
        });
      }
    }
  });

// sunrise/sunset are ISO time strings rather than numbers, so they get their own array type.
const nullableStringArray = z.array(z.string().nullable());

export const openMeteoDailySchema = z
  .object({
    time: z.array(z.string()),
    temperature_2m_max: nullableNumberArray,
    temperature_2m_min: nullableNumberArray,
    weather_code: nullableNumberArray,
    sunrise: nullableStringArray,
    sunset: nullableStringArray,
    daylight_duration: nullableNumberArray,
    uv_index_max: nullableNumberArray,
    precipitation_sum: nullableNumberArray,
    precipitation_probability_max: nullableNumberArray,
    wind_speed_10m_max: nullableNumberArray,
  })
  .superRefine((daily, ctx) => {
    const variableKeys = [
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
    for (const key of variableKeys) {
      if (daily[key].length !== daily.time.length) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `daily.${key} length (${daily[key].length}) does not match daily.time length (${daily.time.length})`,
        });
      }
    }
  });

export const openMeteoForecastResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  utc_offset_seconds: z.number(),
  current: openMeteoCurrentSchema,
  hourly: openMeteoHourlySchema,
  daily: openMeteoDailySchema,
});

export type OpenMeteoCurrent = z.infer<typeof openMeteoCurrentSchema>;
export type OpenMeteoHourly = z.infer<typeof openMeteoHourlySchema>;
export type OpenMeteoDaily = z.infer<typeof openMeteoDailySchema>;
export type OpenMeteoForecastResponse = z.infer<typeof openMeteoForecastResponseSchema>;

// Open-Meteo returns this shape (with a non-200 status) for bad requests, e.g. invalid coordinates.
export const openMeteoErrorResponseSchema = z.object({
  error: z.literal(true),
  reason: z.string(),
});

export type OpenMeteoErrorResponse = z.infer<typeof openMeteoErrorResponseSchema>;

// Open-Meteo's geocoding API (geocoding-api.open-meteo.com) omits fields entirely when they have
// no value, rather than returning null, so everything but the core identity/coordinates is optional.
export const openMeteoGeocodingResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  feature_code: z.string().optional(),
  country_code: z.string().optional(),
  country_id: z.number().optional(),
  country: z.string().optional(),
  admin1: z.string().optional(),
  admin1_id: z.number().optional(),
  admin2: z.string().optional(),
  admin2_id: z.number().optional(),
  admin3: z.string().optional(),
  admin3_id: z.number().optional(),
  admin4: z.string().optional(),
  admin4_id: z.number().optional(),
  timezone: z.string().optional(),
  population: z.number().optional(),
  postcodes: z.array(z.string()).optional(),
});

// When a search matches nothing, Open-Meteo omits the "results" key entirely rather than
// returning an empty array.
export const openMeteoGeocodingResponseSchema = z.object({
  results: z.array(openMeteoGeocodingResultSchema).optional(),
});

export type OpenMeteoGeocodingResult = z.infer<typeof openMeteoGeocodingResultSchema>;
export type OpenMeteoGeocodingResponse = z.infer<typeof openMeteoGeocodingResponseSchema>;
