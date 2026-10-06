// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { normalizeOpenMeteoAirQuality, normalizeOpenMeteoForecast } from '@/lib/weather/normalize-open-meteo';
import { fetchOpenMeteoForecast } from '@/lib/weather/providers/open-meteo';
import { fetchOpenMeteoAirQuality } from '@/lib/weather/providers/open-meteo-air-quality';
import { fetchOpenMeteoGeocoding } from '@/lib/weather/providers/open-meteo-geocoding';

/*
  Contract checks against the real Open-Meteo APIs. Every other test runs on recorded fixtures,
  so an upstream change (a renamed field, a new null) would pass PR CI and only break in
  production. These run nightly (.github/workflows/nightly.yml) and are skipped everywhere else —
  PR CI must not depend on a third party being up, and the cloud sandbox can't reach it anyway.
*/
const live = Boolean(process.env.LIVE_UPSTREAM);
const NEW_YORK = { latitude: 40.7128, longitude: -74.006, timezone: 'auto' };

describe.skipIf(!live)('Open-Meteo, live', { timeout: 30_000 }, () => {
  it('forecast still matches our schema and normalizes to a full week', async () => {
    const response = await fetchOpenMeteoForecast(NEW_YORK);
    const data = normalizeOpenMeteoForecast(response, { name: 'New York', region: 'New York', country: 'United States' });
    expect(data.current).not.toBeNull();
    expect(data.daily.length).toBeGreaterThanOrEqual(7);
    expect(data.hourly.length).toBeGreaterThan(0);
  });

  it('air quality still matches our schema', async () => {
    const metrics = normalizeOpenMeteoAirQuality(await fetchOpenMeteoAirQuality(NEW_YORK));
    expect(metrics).not.toBeNull();
  });

  it('geocoding still finds a well-known place', async () => {
    const results = await fetchOpenMeteoGeocoding({ name: 'Portland' });
    expect(results.length).toBeGreaterThan(0);
  });
});
