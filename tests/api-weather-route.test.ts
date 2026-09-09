import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/weather/route';
import validForecastResponse from './fixtures/open-meteo/valid-response.json';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

// The route's rate limiter is module-level state shared across tests, so each test uses its own
// client IP to get its own budget.
function requestFor(url: string, ip: string): Request {
  return new Request(url, { headers: { 'x-forwarded-for': ip } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/weather', () => {
  it('returns normalized weather data for valid coordinates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(validForecastResponse)));

    const response = await GET(
      requestFor(
        'http://localhost/api/weather?latitude=45.5152&longitude=-122.6784&name=Portland&region=Oregon&country=United+States',
        '10.0.0.1',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('open-meteo');
    expect(body.location).toEqual({
      name: 'Portland',
      region: 'Oregon',
      country: 'United States',
      timezone: 'America/Los_Angeles',
      latitude: 45.5,
      longitude: -122.6784,
    });
    expect(body.current.temperatureF).toBe(72);
  });

  it('sets a CDN cache header on successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(validForecastResponse)));

    const response = await GET(requestFor('http://localhost/api/weather?latitude=45.5&longitude=-122.6', '10.0.0.2'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=600');
    expect(response.headers.get('Cache-Control')).toContain('stale-while-revalidate');
  });

  it('returns 400 when latitude/longitude are missing', async () => {
    const response = await GET(requestFor('http://localhost/api/weather?name=Portland', '10.0.0.3'));
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty('error');
  });

  it('returns 400 when latitude is out of range', async () => {
    const response = await GET(requestFor('http://localhost/api/weather?latitude=999&longitude=-122.6784', '10.0.0.4'));
    expect(response.status).toBe(400);
  });

  it('returns 400 when longitude is out of range', async () => {
    const response = await GET(requestFor('http://localhost/api/weather?latitude=45.5&longitude=-999', '10.0.0.5'));
    expect(response.status).toBe(400);
  });

  it('never caches error responses', async () => {
    const response = await GET(requestFor('http://localhost/api/weather?latitude=999&longitude=0', '10.0.0.6'));
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 502 when the upstream forecast request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ error: true, reason: 'boom' }, 400)));

    const response = await GET(requestFor('http://localhost/api/weather?latitude=45.5152&longitude=-122.6784', '10.0.0.7'));
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns a 504 with the standard error shape when the network itself fails', async () => {
    // Regression: a transport-level rejection used to escape the route as a raw TypeError, which
    // Next.js renders as a 500 HTML page instead of our { error } JSON shape.
    //
    // 504 rather than 502: we never reached Open-Meteo at all, so there is no bad gateway response
    // to report — only a request that went nowhere.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    const response = await GET(requestFor('http://localhost/api/weather?latitude=45.5&longitude=-122.6', '10.0.0.9'));

    expect(response.status).toBe(504);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toHaveProperty('error');
  });

  /**
   * Regression: the provider's diagnostic string used to be forwarded to the browser verbatim and
   * printed on every module — real users saw "Open-Meteo response was not valid JSON (status 403)",
   * and a schema failure would have put a whole Zod report on screen. The diagnostic belongs in the
   * server log; the reader gets a sentence they can act on.
   */
  it('never leaks the upstream diagnostic into the response body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>forbidden</html>', { status: 403 })),
    );

    const response = await GET(requestFor('http://localhost/api/weather?latitude=45.5&longitude=-122.7', '10.0.0.11'));
    const body = (await response.json()) as { error: string };

    expect(body.error).not.toMatch(/open-meteo/i);
    expect(body.error).not.toMatch(/json|zod|status \d{3}/i);
    expect(body.error.length).toBeLessThan(120);
  });

  it('returns 429 with Retry-After once the per-client limit is exceeded', async () => {
    const ip = '10.0.0.8';
    const url = 'http://localhost/api/weather?latitude=999&longitude=0';

    // Rate limiting runs before query validation, so these invalid requests still consume budget —
    // an invalid-request flood is throttled too. That keeps upstream fetch out of this test.
    for (let i = 0; i < 30; i += 1) {
      const response = await GET(requestFor(url, ip));
      expect(response.status).toBe(400);
    }

    const limited = await GET(requestFor(url, ip));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(await limited.json()).toHaveProperty('error');
  });
});
