import { describe, expect, it } from 'vitest';
import { placeholderWeather, weatherSummarySchema } from '@/lib/weather-schema';

describe('weatherSummarySchema', () => {
  it('validates the placeholder weather summary', () => {
    expect(weatherSummarySchema.parse(placeholderWeather)).toEqual(placeholderWeather);
  });
});
