import { z } from 'zod';

export const weatherSummarySchema = z.object({
  city: z.string().min(1),
  condition: z.string().min(1),
  temperatureF: z.number(),
});

export type WeatherSummary = z.infer<typeof weatherSummarySchema>;

export const placeholderWeather: WeatherSummary = weatherSummarySchema.parse({
  city: 'Portland',
  condition: 'Partly cloudy',
  temperatureF: 68,
});
