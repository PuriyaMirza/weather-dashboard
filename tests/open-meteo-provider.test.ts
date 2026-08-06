import { describe, expect, it } from 'vitest';
import { OpenMeteoError, buildOpenMeteoForecastUrl, fetchOpenMeteoForecast } from '@/lib/weather/providers/open-meteo';
import validResponse from './fixtures/open-meteo/valid-response.json';
import malformedResponse from './fixtures/open-meteo/malformed-response.json';

function fakeFetch(body: unknown, init?: { status?: number }): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
    })) as unknown as typeof fetch;
}

const PARAMS = { latitude: 45.5152, longitude: -122.6784, timezone: 'America/Los_Angeles' };

describe('buildOpenMeteoForecastUrl', () => {
  it('includes coordinates, unit preferences, and the requested variable lists', () => {
    const url = new URL(buildOpenMeteoForecastUrl(PARAMS));

    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('45.5152');
    expect(url.searchParams.get('longitude')).toBe('-122.6784');
    expect(url.searchParams.get('timezone')).toBe('America/Los_Angeles');
    expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit');
    expect(url.searchParams.get('wind_speed_unit')).toBe('mph');
    expect(url.searchParams.get('current')).toContain('temperature_2m');
    expect(url.searchParams.get('hourly')).toContain('dew_point_2m');
    expect(url.searchParams.get('daily')).toBe('temperature_2m_max,temperature_2m_min');
  });
});

describe('fetchOpenMeteoForecast', () => {
  it('returns a validated forecast on success', async () => {
    const result = await fetchOpenMeteoForecast(PARAMS, fakeFetch(validResponse));
    expect(result.timezone).toBe('America/Los_Angeles');
    expect(result.current.temperature_2m).toBe(72);
  });

  it('throws OpenMeteoError when the response fails schema validation', async () => {
    await expect(fetchOpenMeteoForecast(PARAMS, fakeFetch(malformedResponse))).rejects.toThrow(OpenMeteoError);
  });

  it('throws OpenMeteoError with the upstream reason on a non-200 response', async () => {
    const fetchImpl = fakeFetch({ error: true, reason: 'Latitude must be in range of -90 to 90°' }, { status: 400 });
    await expect(fetchOpenMeteoForecast(PARAMS, fetchImpl)).rejects.toThrow(/Latitude must be in range/);
  });

  it('throws OpenMeteoError when the response body is not JSON', async () => {
    const fetchImpl = (async () => new Response('not json', { status: 200 })) as unknown as typeof fetch;
    await expect(fetchOpenMeteoForecast(PARAMS, fetchImpl)).rejects.toThrow(OpenMeteoError);
  });
});
