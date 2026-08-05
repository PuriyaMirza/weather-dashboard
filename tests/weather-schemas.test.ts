import { describe, expect, it } from 'vitest';
import { openMeteoForecastResponseSchema } from '@/lib/weather/schemas';
import validResponse from './fixtures/open-meteo/valid-response.json';
import malformedResponse from './fixtures/open-meteo/malformed-response.json';
import partialResponse from './fixtures/open-meteo/partial-response.json';

describe('openMeteoForecastResponseSchema', () => {
  it('accepts a valid forecast response', () => {
    const result = openMeteoForecastResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('accepts a response with null values for individual variables (partial data)', () => {
    const result = openMeteoForecastResponseSchema.safeParse(partialResponse);
    expect(result.success).toBe(true);
  });

  it('rejects a response with a wrong-typed field, a missing required block, and mismatched array lengths', () => {
    const result = openMeteoForecastResponseSchema.safeParse(malformedResponse);
    expect(result.success).toBe(false);
  });

  it('rejects a response whose hourly arrays do not match hourly.time length', () => {
    const tampered = structuredClone(validResponse);
    tampered.hourly.temperature_2m = tampered.hourly.temperature_2m.slice(0, 2);

    const result = openMeteoForecastResponseSchema.safeParse(tampered);
    expect(result.success).toBe(false);
  });

  it('rejects a response missing a required top-level field', () => {
    const { daily: _daily, ...withoutDaily } = structuredClone(validResponse);
    const result = openMeteoForecastResponseSchema.safeParse(withoutDaily);
    expect(result.success).toBe(false);
  });
});
