import { describe, expect, it } from 'vitest';
import { OpenMeteoGeocodingError, buildOpenMeteoGeocodingUrl, fetchOpenMeteoGeocoding } from '@/lib/weather/providers/open-meteo-geocoding';
import geocodingResults from './fixtures/open-meteo/geocoding-results.json';

function fakeFetch(body: unknown, init?: { status?: number }): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
    })) as unknown as typeof fetch;
}

describe('buildOpenMeteoGeocodingUrl', () => {
  it('includes the search name and defaults', () => {
    const url = new URL(buildOpenMeteoGeocodingUrl({ name: 'Portland, Oregon' }));
    expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search');
    expect(url.searchParams.get('name')).toBe('Portland, Oregon');
    expect(url.searchParams.get('count')).toBe('5');
    expect(url.searchParams.get('language')).toBe('en');
    expect(url.searchParams.get('format')).toBe('json');
  });
});

describe('fetchOpenMeteoGeocoding', () => {
  it('returns validated results, best match first', async () => {
    const results = await fetchOpenMeteoGeocoding({ name: 'Portland' }, fakeFetch(geocodingResults));
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Portland');
    expect(results[0].admin1).toBe('Oregon');
  });

  it('returns an empty array when the response omits "results" entirely (no matches)', async () => {
    const results = await fetchOpenMeteoGeocoding({ name: 'Nowhereville' }, fakeFetch({}));
    expect(results).toEqual([]);
  });

  it('accepts results with optional fields omitted', async () => {
    const results = await fetchOpenMeteoGeocoding(
      { name: 'X' },
      fakeFetch({ results: [{ id: 1, name: 'X', latitude: 0, longitude: 0 }] }),
    );
    expect(results).toHaveLength(1);
    expect(results[0].admin1).toBeUndefined();
  });

  it('throws OpenMeteoGeocodingError when the response fails schema validation', async () => {
    const fetchImpl = fakeFetch({ results: [{ id: 'not-a-number', name: 'X', latitude: 0, longitude: 0 }] });
    await expect(fetchOpenMeteoGeocoding({ name: 'X' }, fetchImpl)).rejects.toThrow(OpenMeteoGeocodingError);
  });

  it('throws OpenMeteoGeocodingError with the upstream reason on a non-200 response', async () => {
    const fetchImpl = fakeFetch({ error: true, reason: 'name is required' }, { status: 400 });
    await expect(fetchOpenMeteoGeocoding({ name: '' }, fetchImpl)).rejects.toThrow(/name is required/);
  });

  it('wraps transport-level failures so callers never see a raw TypeError', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;

    await expect(fetchOpenMeteoGeocoding({ name: 'Portland' }, fetchImpl)).rejects.toThrow(OpenMeteoGeocodingError);
  });
});
