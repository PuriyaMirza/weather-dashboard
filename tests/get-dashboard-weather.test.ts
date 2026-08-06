import { afterEach, describe, expect, it, vi } from 'vitest';
import { WeatherLookupError, getWeatherForPlaceName } from '@/lib/weather/get-dashboard-weather';
import geocodingResults from './fixtures/open-meteo/geocoding-results.json';
import validForecastResponse from './fixtures/open-meteo/valid-response.json';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getWeatherForPlaceName', () => {
  it('geocodes the place, fetches its forecast, and normalizes the result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(geocodingResults))
      .mockResolvedValueOnce(jsonResponse(validForecastResponse));
    vi.stubGlobal('fetch', fetchMock);

    const data = await getWeatherForPlaceName('Portland, Oregon');

    expect(data.source).toBe('open-meteo');
    expect(data.location.name).toBe('Portland');
    expect(data.location.region).toBe('Oregon');
    expect(data.location.country).toBe('United States');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The forecast request should use the matched location's coordinates, not the raw place name.
    const forecastUrl = new URL(fetchMock.mock.calls[1][0] as string);
    expect(forecastUrl.searchParams.get('latitude')).toBe('45.52345');
    expect(forecastUrl.searchParams.get('longitude')).toBe('-122.67621');
  });

  it('throws WeatherLookupError when no location matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({})));
    await expect(getWeatherForPlaceName('Nowhereville')).rejects.toThrow(WeatherLookupError);
  });

  it('throws WeatherLookupError when geocoding fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ error: true, reason: 'boom' }, 400)));
    await expect(getWeatherForPlaceName('Portland')).rejects.toThrow(/Could not look up/);
  });

  it('throws WeatherLookupError when the forecast request fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(geocodingResults))
      .mockResolvedValueOnce(jsonResponse({ error: true, reason: 'server error' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getWeatherForPlaceName('Portland, Oregon')).rejects.toThrow(/Could not fetch weather/);
  });
});
