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
  pressure_msl: nullableNumber,
});

export const openMeteoHourlySchema = z
  .object({
    time: z.array(z.string()),
    temperature_2m: nullableNumberArray,
    apparent_temperature: nullableNumberArray,
    precipitation_probability: nullableNumberArray,
    weather_code: nullableNumberArray,
    dew_point_2m: nullableNumberArray,
    uv_index: nullableNumberArray,
    visibility: nullableNumberArray,
  })
  .superRefine((hourly, ctx) => {
    const variableKeys = [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'weather_code',
      'dew_point_2m',
      'uv_index',
      'visibility',
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

export const openMeteoDailySchema = z
  .object({
    time: z.array(z.string()),
    temperature_2m_max: nullableNumberArray,
    temperature_2m_min: nullableNumberArray,
  })
  .superRefine((daily, ctx) => {
    const variableKeys = ['temperature_2m_max', 'temperature_2m_min'] as const;
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
