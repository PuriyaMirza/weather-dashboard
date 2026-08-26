import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OpenMeteoAirQualityError,
  buildOpenMeteoAirQualityUrl,
  fetchOpenMeteoAirQuality,
} from '@/lib/weather/providers/open-meteo-air-quality';
import { openMeteoAirQualityResponseSchema } from '@/lib/weather/schemas';
import { categorizeUsAqi, normalizeOpenMeteoAirQuality } from '@/lib/weather/normalize-open-meteo';
import { GET } from '@/app/api/weather/route';
import airQualityResponse from './fixtures/open-meteo/air-quality-response.json';
import validForecastResponse from './fixtures/open-meteo/valid-response.json';

const PARAMS = { latitude: 45.5152, longitude: -122.6784, timezone: 'auto' };

function fakeFetch(body: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildOpenMeteoAirQualityUrl', () => {
  it('targets the separate air-quality host with the pollutants we render', () => {
    const url = new URL(buildOpenMeteoAirQualityUrl(PARAMS));

    // A different host from the forecast API, not just a different path.
    expect(url.origin + url.pathname).toBe('https://air-quality-api.open-meteo.com/v1/air-quality');
    expect(url.searchParams.get('current')).toContain('us_aqi');
    expect(url.searchParams.get('current')).toContain('pm2_5');
    expect(url.searchParams.get('latitude')).toBe('45.5152');
  });
});

describe('fetchOpenMeteoAirQuality', () => {
  it('returns validated data on success', async () => {
    const result = await fetchOpenMeteoAirQuality(PARAMS, fakeFetch(airQualityResponse));
    expect(result.current.us_aqi).toBe(38);
  });

  it('throws its own error type on a bad response', async () => {
    await expect(fetchOpenMeteoAirQuality(PARAMS, fakeFetch({ nope: true }))).rejects.toThrow(OpenMeteoAirQualityError);
  });

  it('wraps transport failures so callers never see a raw TypeError', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;

    await expect(fetchOpenMeteoAirQuality(PARAMS, fetchImpl)).rejects.toThrow(/Could not reach Open-Meteo air quality/);
  });

  it('surfaces the upstream reason on a non-200', async () => {
    await expect(
      fetchOpenMeteoAirQuality(PARAMS, fakeFetch({ error: true, reason: 'out of range' }, 400)),
    ).rejects.toThrow(/out of range/);
  });
});

describe('schema', () => {
  it('accepts the fixture', () => {
    expect(openMeteoAirQualityResponseSchema.safeParse(airQualityResponse).success).toBe(true);
  });

  it('accepts nulls for individual pollutants', () => {
    const nulled = structuredClone(airQualityResponse) as {
      current: Record<string, number | string | null>;
    };
    nulled.current.us_aqi = null;
    nulled.current.pm2_5 = null;
    expect(openMeteoAirQualityResponseSchema.safeParse(nulled).success).toBe(true);
  });
});

describe('categorizeUsAqi', () => {
  it('maps each EPA band, including its boundaries', () => {
    expect(categorizeUsAqi(0)).toBe('good');
    expect(categorizeUsAqi(50)).toBe('good');
    expect(categorizeUsAqi(51)).toBe('moderate');
    expect(categorizeUsAqi(100)).toBe('moderate');
    expect(categorizeUsAqi(101)).toBe('sensitive');
    expect(categorizeUsAqi(150)).toBe('sensitive');
    expect(categorizeUsAqi(151)).toBe('unhealthy');
    expect(categorizeUsAqi(200)).toBe('unhealthy');
    expect(categorizeUsAqi(201)).toBe('very-unhealthy');
    expect(categorizeUsAqi(300)).toBe('very-unhealthy');
    expect(categorizeUsAqi(301)).toBe('hazardous');
  });

  it('has no category when there is no reading', () => {
    expect(categorizeUsAqi(null)).toBeNull();
    expect(categorizeUsAqi(undefined)).toBeNull();
  });
});

describe('normalizeOpenMeteoAirQuality', () => {
  it('maps pollutants and derives the category', () => {
    const metrics = normalizeOpenMeteoAirQuality(airQualityResponse);
    expect(metrics).toMatchObject({ usAqi: 38, category: 'good', pm2_5: 8.4, nitrogenDioxide: 9.1 });
  });

  it('returns null when every pollutant is missing, rather than an object full of nulls', () => {
    const empty = structuredClone(airQualityResponse) as {
      current: Record<string, number | string | null>;
    };
    for (const key of Object.keys(empty.current)) {
      if (key !== 'time' && key !== 'interval') empty.current[key] = null;
    }
    const parsed = openMeteoAirQualityResponseSchema.parse(empty);
    expect(normalizeOpenMeteoAirQuality(parsed)).toBeNull();
  });
});

/**
 * The behaviour that matters most: air quality is supplementary, so its failure must never cost
 * the user their forecast.
 */
describe('GET /api/weather — air quality degrades independently', () => {
  function requestFor(ip: string) {
    return new Request('http://localhost/api/weather?latitude=45.5&longitude=-122.6&name=Portland', {
      headers: { 'x-forwarded-for': ip },
    });
  }

  function routeFetch(forecast: unknown, airQuality: unknown | Error) {
    return vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('air-quality')) {
        if (airQuality instanceof Error) throw airQuality;
        return new Response(JSON.stringify(airQuality), { status: 200 });
      }
      return new Response(JSON.stringify(forecast), { status: 200 });
    });
  }

  it('includes air quality when both upstreams succeed', async () => {
    vi.stubGlobal('fetch', routeFetch(validForecastResponse, airQualityResponse));

    const body = await (await GET(requestFor('10.9.0.1'))).json();

    expect(body.airQuality).toMatchObject({ usAqi: 38, category: 'good' });
    // It also backfills the Comfort card's long-null AQI field.
    expect(body.comfort.airQualityIndex).toBe(38);
  });

  it('still returns the forecast when air quality fails outright', async () => {
    vi.stubGlobal('fetch', routeFetch(validForecastResponse, new TypeError('air quality is down')));

    const response = await GET(requestFor('10.9.0.2'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.current.temperatureF).toBe(72);
    expect(body.airQuality).toBeNull();
    expect(body.comfort.airQualityIndex).toBeNull();
  });

  it('still returns the forecast when air quality returns something unparseable', async () => {
    vi.stubGlobal('fetch', routeFetch(validForecastResponse, { unexpected: 'shape' }));

    const response = await GET(requestFor('10.9.0.3'));
    expect(response.status).toBe(200);
    expect((await response.json()).airQuality).toBeNull();
  });

  it('still fails when the forecast itself fails — that one is not optional', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) =>
        String(input).includes('air-quality')
          ? new Response(JSON.stringify(airQualityResponse), { status: 200 })
          : new Response(JSON.stringify({ error: true, reason: 'boom' }), { status: 400 }),
      ),
    );

    expect((await GET(requestFor('10.9.0.4'))).status).toBe(502);
  });
});
